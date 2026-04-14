'use client'

import { useState } from 'react'
import type { Session } from '@/lib/supabase/client'

export default function CreateInitiativeModal({
  workspaceId,
  sessions,
  onClose,
  onCreated,
}: {
  workspaceId: string
  sessions: Session[]
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [sessionId, setSessionId] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const openSessions = sessions.filter(s => s.status === 'open')

  async function create() {
    if (!title.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        session_id: sessionId || null,
        title,
        description: desc,
      }),
    })
    if (res.ok) { onCreated(); onClose() }
    else { setError((await res.json()).error || 'Erro ao criar iniciativa.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-white">Nova Iniciativa</h2>
        <div className="space-y-3">
          <div>
            <input
              autoFocus
              placeholder="Título (max 200 chars)"
              maxLength={200}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm"
            />
            <p className="text-xs text-slate-600 mt-1 text-right">{title.length}/200</p>
          </div>
          <textarea
            placeholder="Descrição opcional (max 2000 chars)"
            maxLength={2000}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm resize-none"
          />
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Vincular a uma sessão (opcional)</label>
            <select
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-teal text-sm"
            >
              <option value="">Sem sessão (iniciativa avulsa)</option>
              {openSessions.length === 0 && (
                <option disabled value="">Nenhuma sessão aberta</option>
              )}
              {openSessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={create}
            disabled={saving || !title.trim()}
            className="px-5 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {saving ? 'Criando…' : '+ Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
