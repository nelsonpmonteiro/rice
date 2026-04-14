'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!email) return
    setLoading(true)

    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    // Sempre exibir confirmação genérica independente do resultado
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl font-black text-brand-teal">RICE</div>
          <h1 className="text-xl font-bold text-white">Recuperar senha</h1>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-5">
              <p className="text-emerald-300 text-sm">
                Se esse e-mail estiver cadastrado, você receberá um link de recuperação em breve.
              </p>
            </div>
            <Link href="/login" className="block text-sm text-brand-teal hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              autoFocus
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
            />
            <button
              onClick={send}
              disabled={loading || !email}
              className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
            <p className="text-center text-sm text-slate-600">
              <Link href="/login" className="text-slate-500 hover:text-slate-300 transition-colors">
                Voltar para o login
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
