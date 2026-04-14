'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClientSession } from '@/lib/supabase/client'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'

export default function AccountSettingsPage() {
  const router = useRouter()

  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  useEffect(() => {
    const session = getClientSession()
    if (!session?.user) { router.push('/login'); return }
    setName((session.user.user_metadata?.name as string) || '')
    setEmail(session.user.email || '')
  }, [router])

  async function save() {
    if (!name.trim()) { setError('O nome é obrigatório.'); return }
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch('/api/account', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: name.trim() }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao salvar.')
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/account', { method: 'DELETE' })
    if (res.ok) {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao excluir conta.')
      setDeleting(false)
      setShowDelete(false)
    }
  }

  return (
    <>
      <main className="p-6 sm:p-8 max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-1">Configurações</div>
          <h1 className="text-2xl font-bold text-white">Minha conta</h1>
        </div>

        {/* Profile section */}
        <section className="rounded-2xl border border-slate-800 bg-brand-mid overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Perfil</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={80}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-brand-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-mail</label>
              <input
                value={email}
                readOnly
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-500 text-sm
                           cursor-not-allowed"
              />
              <p className="text-xs text-slate-600">O e-mail não pode ser alterado aqui.</p>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={saving || !name.trim()}
                className="px-5 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl
                           hover:bg-cyan-300 transition-colors disabled:opacity-50"
              >
                {saved ? '✓ Salvo' : saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </section>

        {/* Security shortcut */}
        <section className="rounded-2xl border border-slate-800 bg-brand-mid overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Segurança</h2>
          </div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Senha</p>
              <p className="text-xs text-slate-500 mt-0.5">Altere sua senha de acesso</p>
            </div>
            <button
              onClick={() => router.push('/settings/security')}
              className="px-4 py-2 border border-slate-700 text-slate-400 text-sm rounded-xl
                         hover:text-white hover:border-slate-500 transition-colors"
            >
              Alterar senha →
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-red-900/30 bg-brand-mid overflow-hidden">
          <div className="px-6 py-4 border-b border-red-900/20">
            <h2 className="text-sm font-semibold text-red-400">Zona de perigo</h2>
          </div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Excluir conta</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Remove permanentemente sua conta e todos os seus dados.
              </p>
            </div>
            <button
              onClick={() => setShowDelete(true)}
              className="px-4 py-2 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl
                         hover:bg-red-900/20 transition-colors"
            >
              Excluir conta
            </button>
          </div>
        </section>
      </main>

      {showDelete && (
        <ConfirmDeleteModal
          mode="name"
          confirmName={email}
          title="Excluir sua conta"
          message="Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão removidos."
          onConfirm={deleteAccount}
          onClose={() => setShowDelete(false)}
          loading={deleting}
        />
      )}
    </>
  )
}
