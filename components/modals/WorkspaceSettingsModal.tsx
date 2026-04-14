'use client'

import { useState, useEffect } from 'react'
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal'
import type { Workspace } from '@/lib/supabase/client'

type InviteState = { invite_token: string | null; invite_active: boolean } | null

export default function WorkspaceSettingsModal({
  workspace,
  onClose,
  onUpdated,
  onDeleted,
}: {
  workspace: Workspace
  onClose:   () => void
  onUpdated: () => void
  onDeleted: () => void
}) {
  const [name,        setName]        = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  const [invite,       setInvite]      = useState<InviteState>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied,       setCopied]      = useState(false)

  useEffect(() => {
    fetch(`/api/workspaces/${workspace.id}/invite`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setInvite(d))
  }, [workspace.id])

  const inviteUrl = invite?.invite_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${invite.invite_token}`
    : null

  async function toggleInvite() {
    setInviteLoading(true)
    const method = invite?.invite_active ? 'DELETE' : 'POST'
    const body   = invite?.invite_active ? undefined : JSON.stringify({ regenerate: !invite?.invite_token })
    const res = await fetch(`/api/workspaces/${workspace.id}/invite`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body,
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) setInvite(d)
    setInviteLoading(false)
  }

  async function regenerateLink() {
    setInviteLoading(true)
    const res = await fetch(`/api/workspaces/${workspace.id}/invite`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ regenerate: true }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) setInvite(d)
    setInviteLoading(false)
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function save() {
    if (!name.trim()) { setError('O nome é obrigatório.'); return }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    })
    setSaving(false)
    if (res.ok) { onUpdated() }
    else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || `Erro ${res.status} ao salvar.`)
    }
  }

  async function destroy() {
    setDeleting(true)
    const res = await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) { onDeleted() }
    else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao excluir workspace.')
      setShowDelete(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-brand-mid border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Configurações do workspace</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>

          <div className="p-6 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={80}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-brand-teal placeholder:text-slate-600"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição <span className="text-slate-600 normal-case font-normal">(opcional)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-brand-teal placeholder:text-slate-600 resize-none"
                placeholder="Descreva o propósito deste workspace…"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Save */}
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !name.trim()}
                className="px-5 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl
                           hover:bg-cyan-300 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>

            {/* Invite link */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Link de convite</p>
                <button
                  onClick={toggleInvite}
                  disabled={inviteLoading}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                    ${invite?.invite_active ? 'bg-brand-teal' : 'bg-slate-700'}
                    disabled:opacity-50`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                    ${invite?.invite_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {invite?.invite_active && inviteUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteUrl}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-xs
                                 focus:outline-none truncate"
                    />
                    <button
                      onClick={copyLink}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300
                                 hover:bg-slate-700 hover:text-white transition-colors shrink-0"
                    >
                      {copied ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <button
                    onClick={regenerateLink}
                    disabled={inviteLoading}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ↻ Gerar novo link (invalida o atual)
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Ative o link para compartilhar com pessoas de fora do workspace.
                </p>
              )}
            </div>

            {/* Danger zone */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Zona de perigo</p>
              <p className="text-xs text-slate-500">
                Excluir este workspace é uma ação permanente. Todas as sessões, iniciativas e votos serão apagados.
              </p>
              <button
                onClick={() => setShowDelete(true)}
                className="px-4 py-2 border border-red-500/40 text-red-400 text-sm font-semibold rounded-xl
                           hover:bg-red-900/20 transition-colors"
              >
                Excluir workspace
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDelete && (
        <ConfirmDeleteModal
          mode="name"
          confirmName={workspace.name}
          title="Excluir workspace"
          message={`Esta ação é irreversível. Todo o conteúdo de "${workspace.name}" será permanentemente excluído.`}
          onConfirm={destroy}
          onClose={() => setShowDelete(false)}
          loading={deleting}
        />
      )}
    </>
  )
}
