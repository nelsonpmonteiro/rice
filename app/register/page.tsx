'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [sent, setSent]             = useState(false)

  async function register() {
    if (!name || !email || !password || !confirm) return
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (authError) {
      setError(authError.message.includes('already') ? 'E-mail já está em uso.' : authError.message)
      setLoading(false)
      return
    }

    // Se session existe: confirmação desativada — redirecionar direto
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    // session null: e-mail de confirmação enviado
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl font-black text-brand-teal">RICE</div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-6 space-y-2">
            <p className="text-white font-semibold">Verifique seu e-mail</p>
            <p className="text-slate-400 text-sm">
              Enviamos um link de confirmação para <span className="text-white">{email}</span>.
              Clique no link para ativar sua conta.
            </p>
          </div>
          <Link href="/login" className="block text-sm text-brand-teal hover:underline">
            Voltar para o login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl font-black text-brand-teal">RICE</div>
          <h1 className="text-xl font-bold text-white">Criar conta</h1>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nome completo"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            autoComplete="name"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          <input
            type="password"
            placeholder="Senha (mín. 8 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          <input
            type="password"
            placeholder="Confirmar senha"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && register()}
            autoComplete="new-password"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={register}
            disabled={loading || !name || !email || !password || !confirm}
            className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando conta…' : 'Criar conta →'}
          </button>
        </div>

        <p className="text-center text-sm text-slate-600">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-teal hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
