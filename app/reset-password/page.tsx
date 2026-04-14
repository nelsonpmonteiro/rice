'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [ready, setReady]       = useState(false)
  const [invalid, setInvalid]   = useState(false)

  useEffect(() => {
    // Supabase envia o token via URL hash — onAuthStateChange detecta PASSWORD_RECOVERY
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    // Timeout: se não receber PASSWORD_RECOVERY em 3s, token inválido/expirado
    const timer = setTimeout(() => setInvalid(true), 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function reset() {
    if (!password || !confirm) return
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  if (!ready && invalid) return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl font-black text-brand-teal">RICE</div>
        <div className="rounded-xl border border-red-500/30 bg-red-900/10 p-5">
          <p className="text-red-400 text-sm">Link expirado ou inválido.</p>
        </div>
        <Link href="/forgot-password" className="block text-sm text-brand-teal hover:underline">
          Solicitar novo link →
        </Link>
      </div>
    </main>
  )

  if (!ready) return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-slate-500 text-sm">Verificando link…</div>
    </main>
  )

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl font-black text-brand-teal">RICE</div>
          <h1 className="text-xl font-bold text-white">Nova senha</h1>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha (mín. 8 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && reset()}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={reset}
            disabled={loading || !password || !confirm}
            className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando…' : 'Salvar nova senha →'}
          </button>
        </div>
      </div>
    </main>
  )
}
