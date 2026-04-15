'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, getClientSession } from '@/lib/supabase/client'
import VoteSummaryTable     from '@/components/voting/VoteSummaryTable'
import ParticipationIndicator from '@/components/voting/ParticipationIndicator'

type VoteRow = {
  initiative_id: string
  reach:         number
  impact:        number
  confidence:    number
  effort:        number
  comment:       string | null
  initiatives:   { title: string } | null
}

export default function VoteDonePage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  const [votes,        setVotes]        = useState<VoteRow[]>([])
  const [workspaceId,  setWorkspaceId]  = useState('')
  const [sessionClosed, setSessionClosed] = useState(false)
  const [voterCount,   setVoterCount]   = useState(0)
  const [memberCount,  setMemberCount]  = useState(0)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    const cs = getClientSession()
    if (!cs?.user) { router.replace('/login'); return }

    Promise.all([
      fetch(`/api/sessions/${sessionId}/results/my-votes`).then(r => r.ok ? r.json() : null),
      fetch(`/api/sessions/${sessionId}`).then(r => r.ok ? r.json() : null),
    ]).then(([mv, sd]) => {
      if (!mv || !sd) { router.replace('/dashboard'); return }
      setVotes(mv.votes)
      setWorkspaceId(sd.session.workspace_id)
      setSessionClosed(sd.session.status === 'closed')
      setVoterCount(sd.voterCount ?? 0)
      setMemberCount(sd.memberCount ?? 0)
      setLoading(false)
    })
  }, [sessionId, router])

  // Realtime: watch session status change
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`done-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, payload => {
        const s = payload.new as { status?: string; voting_open?: boolean }
        if (s.status === 'closed' || s.voting_open === false) {
          setSessionClosed(true)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => {
        fetch(`/api/sessions/${sessionId}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d) { setVoterCount(d.voterCount ?? 0); setMemberCount(d.memberCount ?? 0) }
          })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  return (
    <main className="min-h-screen bg-brand-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl">✓</div>
          <h1 className="text-2xl font-bold text-white">Votação concluída!</h1>
          <p className="text-slate-400 text-sm">Seus votos foram registrados com sucesso.</p>
        </div>

        {/* Participation */}
        <div className="flex justify-center">
          <ParticipationIndicator voted={voterCount} total={memberCount} />
        </div>

        {/* Status banner */}
        {!sessionClosed ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-brand-mid px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <p className="text-sm text-slate-400">Aguardando encerramento pelo administrador.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-900/10 px-4 py-3">
            <span className="text-emerald-400">✓</span>
            <p className="text-sm text-emerald-300">Sessão encerrada. Os resultados estão disponíveis.</p>
          </div>
        )}

        {/* My votes */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Meus votos</h2>
          <VoteSummaryTable votes={votes} />
        </div>

        {/* CTA */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/workspace/${workspaceId}`)}
            className="px-5 py-2.5 border border-slate-700 text-slate-400 text-sm font-semibold rounded-xl hover:text-white hover:border-slate-500 transition-colors"
          >
            ← Voltar ao workspace
          </button>
          {sessionClosed && (
            <button
              onClick={() => router.push(`/session/${sessionId}/results`)}
              className="px-5 py-2.5 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors"
            >
              Ver resultados →
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
