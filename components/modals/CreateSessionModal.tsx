'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateSessionModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const router = useRouter()
  const [name, setName]     = useState('')
  const [desc, setDesc]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function create() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, name, description: desc }),
    })
    if (res.ok) {
      const session = await res.json()
      onCreated()
      onClose()
      router.push(`/session/${session.id}/compose`)
    } else {
      setError((await res.json()).error || 'Erro ao criar sessão.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-white">Nova Sessão de Votação</h2>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Nome da sessão (ex: Q2 2025)"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm"
          />
          <textarea
            placeholder="Descrição opcional"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm resize-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={create}
            disabled={saving || !name.trim()}
            className="px-5 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {saving ? 'Criando…' : 'Criar sessão'}
          </button>
        </div>
      </div>
    </div>
  )
}
