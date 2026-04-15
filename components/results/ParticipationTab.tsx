'use client'

import { useState } from 'react'

type UserRow = {
  user_id: string; name: string; email: string; role: string; voted: boolean
}

export default function ParticipationTab({
  sessionId,
  users,
}: {
  sessionId: string
  users:     UserRow[]
}) {
  const [sent,    setSent]    = useState<Record<string, boolean>>({})
  const [sending, setSending] = useState<string | null>(null)

  const voted    = users.filter(u => u.voted)
  const pending  = users.filter(u => !u.voted)

  async function remind(uid: string) {
    setSending(uid)
    const res = await fetch(`/api/sessions/${sessionId}/results/reminder/${uid}`, { method: 'POST' })
    setSending(null)
    if (res.ok || res.status === 429) setSent(s => ({ ...s, [uid]: true }))
  }

  const pct = users.length > 0 ? Math.round((voted.length / users.length) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{voted.length} de {users.length} membros votaram</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-teal rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Voted */}
      {voted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Votaram ({voted.length})</p>
          {voted.map(u => (
            <div key={u.user_id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2.5">
              <div>
                <p className="text-sm text-white">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <span className="text-xs text-emerald-400">✓ Votou</span>
            </div>
          ))}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pendentes ({pending.length})</p>
          {pending.map(u => (
            <div key={u.user_id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2.5">
              <div>
                <p className="text-sm text-white">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <button
                onClick={() => remind(u.user_id)}
                disabled={sending === u.user_id || sent[u.user_id]}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                  ${sent[u.user_id]
                    ? 'border-slate-700 text-slate-500 cursor-default'
                    : 'border-amber-500/30 text-amber-400 hover:bg-amber-900/20'}`}
              >
                {sent[u.user_id] ? '✓ Lembrete enviado' : sending === u.user_id ? '…' : 'Lembrar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
