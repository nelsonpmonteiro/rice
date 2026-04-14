'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect } from 'react'
import Link from 'next/link'
import { loginAction } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50"
    >
      {pending ? 'Entrando…' : 'Entrar →'}
    </button>
  )
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, null)

  useEffect(() => {
    if (state && 'success' in state) {
      // Cookies já setados no response da Server Action — full reload garante que
      // o middleware lê os cookies corretamente na próxima requisição
      window.location.href = '/dashboard'
    }
  }, [state])

  const errorMsg = state && 'error' in state ? state.error : null

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl font-black text-brand-teal">RICE</div>
          <h1 className="text-xl font-bold text-white">Entrar</h1>
          <p className="text-slate-500 text-sm">Ferramenta colaborativa de priorização</p>
        </div>

        <form action={action} className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="E-mail"
            required
            autoFocus
            autoComplete="email"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          <input
            type="password"
            name="password"
            placeholder="Senha"
            required
            autoComplete="current-password"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />

          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

          <SubmitButton />
        </form>

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
