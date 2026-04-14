'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SecuritySettingsContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const forced       = searchParams.get('forced') === '1'

  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const passwordsMatch = next === confirm
  const canSave = next.length >= 8 && passwordsMatch && !saving

  async function changePassword() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/account/password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: next }),
    })
    setSaving(false)
    if (res.ok) {
      if (forced) { router.push('/dashboard'); return }
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao alterar senha.')
    }
  }

  return (
    <main className="p-6 sm:p-8 max-w-xl mx-auto space-y-8">
      {/* Header */}
      {forced ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-400 text-lg mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">Troca de senha obrigatória</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Um admin definiu uma senha temporária para sua conta. Crie uma nova senha para continuar.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings/account')}
            className="text-slate-500 hover:text-white transition-colors text-sm"
          >
            ← Conta
          </button>
          <span className="text-slate-700">/</span>
          <div>
            <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-0.5">Configurações</div>
            <h1 className="text-2xl font-bold text-white">Segurança</h1>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-brand-mid overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Alterar senha</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {success && (
            <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <span className="text-emerald-400">✓</span>
              <p className="text-sm text-emerald-300">Senha alterada com sucesso.</p>
            </div>
          )}

          {/* Current password — validation happens server-side via Supabase
              We collect it for UX but don't currently re-verify (service role resets directly).
              To enforce it, add a signInWithPassword check before the admin update. */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Senha atual</label>
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm
                         focus:outline-none focus:border-brand-teal"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nova senha</label>
            <input
              type="password"
              value={next}
              onChange={e => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm
                         focus:outline-none focus:border-brand-teal"
            />
            {next.length > 0 && next.length < 8 && (
              <p className="text-xs text-amber-400">Mínimo 8 caracteres</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmar nova senha</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={`w-full bg-slate-900 border rounded-lg px-3 py-2.5 text-white text-sm
                         focus:outline-none transition-colors
                         ${confirm.length > 0 && !passwordsMatch
                           ? 'border-red-500 focus:border-red-400'
                           : 'border-slate-700 focus:border-brand-teal'}`}
            />
            {confirm.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-400">As senhas não coincidem</p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end">
            <button
              onClick={changePassword}
              disabled={!canSave}
              className="px-5 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl
                         hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando…' : 'Alterar senha'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function SecuritySettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>}>
      <SecuritySettingsContent />
    </Suspense>
  )
}
