'use client'

import { useState } from 'react'

type DraftInitiative = {
  id:          string
  title:       string
  description: string | null
  created_at:  string
}

export default function DraftQueue({
  drafts,
  onRefresh,
}: {
  drafts:     DraftInitiative[]
  onRefresh:  () => void
}) {
  const [acting, setActing] = useState<string | null>(null)

  if (drafts.length === 0) return null

  async function approve(id: string) {
    setActing(id)
    await fetch(`/api/initiatives/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'approved' }),
    })
    setActing(null)
    onRefresh()
  }

  async function reject(id: string) {
    setActing(id)
    await fetch(`/api/initiatives/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'archived' }),
    })
    setActing(null)
    onRefresh()
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/10">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          Aguardando aprovação
        </p>
        <span className="ml-auto text-xs text-amber-500/70 bg-amber-900/30 px-2 py-0.5 rounded-full">
          {drafts.length}
        </span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {drafts.map(d => (
          <div key={d.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{d.title}</p>
              {d.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{d.description}</p>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => approve(d.id)}
                disabled={acting === d.id}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30
                           rounded-lg hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
              >
                Aprovar
              </button>
              <button
                onClick={() => reject(d.id)}
                disabled={acting === d.id}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-700
                           rounded-lg hover:text-red-400 hover:border-red-500/30 hover:bg-red-900/10 transition-colors disabled:opacity-50"
              >
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
