'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function login() {
    if (!email || !password) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'E-mail ou senha incorretos.')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl font-black text-brand-teal">RICE</div>
          <h1 className="text-xl font-bold text-white">Entrar</h1>
          <p className="text-slate-500 text-sm">Ferramenta colaborativa de priorização</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
            autoComplete="email"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoComplete="current-password"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={login}
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar →'}
          </button>
        </div>

        <div className="space-y-2 text-center text-sm">
          <p>
            <Link href="/forgot-password" className="text-slate-500 hover:text-slate-300 transition-colors">
              Esqueci minha senha
            </Link>
          </p>
          <p className="text-slate-600">
            Sem conta?{' '}
            <Link href="/register" className="text-brand-teal hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
