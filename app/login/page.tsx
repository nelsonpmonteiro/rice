'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function login() {
    if (!username || !password) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Credenciais inválidas.')
      setLoading(false)
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
            type="text"
            placeholder="Usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
            autoComplete="username"
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
            disabled={loading || !username || !password}
            className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar →'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-700">
          Área administrativa antiga:{' '}
          <a href="/admin" className="text-slate-500 hover:text-slate-400 underline">
            /admin
          </a>
        </p>
      </div>
    </main>
  )
}
