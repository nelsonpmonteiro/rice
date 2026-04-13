'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function login() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      setError('Senha incorreta.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-3xl font-black text-brand-teal">RICE</div>
          <h1 className="text-xl font-bold text-white">Área Administrativa</h1>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Senha de administrador"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={login}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar →'}
          </button>
        </div>
      </div>
    </main>
  )
}
