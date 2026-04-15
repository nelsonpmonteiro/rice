'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getClientSession } from '@/lib/supabase/client'

export default function BriefingPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  const [data,    setData]    = useState<{ session: { name: string; description: string | null }; initiatives: { id: string }[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cs = getClientSession()
    if (!cs?.user) { router.replace('/login'); return }

    fetch(`/api/sessions/${sessionId}`)
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null }
        if (!r.ok)            { router.replace('/dashboard'); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        if (!d.session.voting_open) { router.replace(`/workspace/${d.session.workspace_id}`); return }
        setData(d)
        setLoading(false)
      })
  }, [sessionId, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )
  if (!data) return null

  const count   = data.initiatives.length
  const minEst  = Math.max(1, Math.round(count * 1.5))

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-8 max-w-md w-full space-y-6">
        {/* Title */}
        <div>
          <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-1">Votação</div>
          <h1 className="text-2xl font-bold text-white">{data.session.name}</h1>
          {data.session.description && (
            <p className="text-slate-400 text-sm mt-1">{data.session.description}</p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-slate-400 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>{count} {count === 1 ? 'iniciativa' : 'iniciativas'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>~{minEst} min estimados</span>
          </div>
        </div>

        {/* Initiative list */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Iniciativas</p>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {data.initiatives.map((init: { id: string; title?: string }, idx: number) => (
              <div key={init.id} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="text-slate-600 font-mono text-xs mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                <span>{(init as { title?: string }).title ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidentiality notice */}
        <div className="flex items-start gap-2.5 bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-800">
          <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-slate-500">
            Sua contribuição é individual. Você não vê os votos dos outros membros durante a votação.
          </p>
        </div>

        <button
          onClick={() => router.push(`/session/${sessionId}/vote/0`)}
          className="w-full px-5 py-3 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors"
        >
          Começar votação →
        </button>
      </div>
    </div>
  )
}
