'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getClientSession } from '@/lib/supabase/client'
import RankingTab         from '@/components/results/RankingTab'
import InitiativeVotesTab from '@/components/results/InitiativeVotesTab'
import ParticipationTab   from '@/components/results/ParticipationTab'
import ExportButton       from '@/components/results/ExportButton'

type Tab = 'ranking' | 'byInitiative' | 'participation'

type RankItem = {
  id: string; title: string; description?: string | null
  rice_score: number | null; reach: number | null; impact: number | null
  confidence: number | null; effort: number | null; vote_count: number; has_override: boolean
}

type UserRow = {
  user_id: string; name: string; email: string; role: string; voted: boolean
}

export default function AdminResultsPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  const [tab,         setTab]         = useState<Tab>('ranking')
  const [ranking,     setRanking]     = useState<RankItem[]>([])
  const [users,       setUsers]       = useState<UserRow[]>([])
  const [sessionName, setSessionName] = useState('')
  const [voterCount,  setVoterCount]  = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const cs = getClientSession()
    if (!cs?.user) { router.replace('/login'); return }

    Promise.all([
      fetch(`/api/sessions/${sessionId}/results`).then(r => r.ok ? r.json() : null),
      fetch(`/api/sessions/${sessionId}/results/users`).then(r => r.ok ? r.json() : null),
    ]).then(([rd, ud]) => {
      if (!rd) { router.replace('/dashboard'); return }
      if (rd.myRole !== 'admin') { router.replace(`/session/${sessionId}/results`); return }
      setRanking(rd.ranking)
      setSessionName(rd.session.name)
      setVoterCount(rd.voterCount)
      setMemberCount(rd.memberCount)
      if (ud) setUsers(ud.users)
      setLoading(false)
    })
  }, [sessionId, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  const tabs: [Tab, string][] = [
    ['ranking',       'Ranking'],
    ['byInitiative',  'Por iniciativa'],
    ['participation', 'Participação'],
  ]

  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest">Resultados</div>
            <span className="text-xs bg-brand-teal/10 text-brand-teal border border-brand-teal/20 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{sessionName}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {voterCount} de {memberCount} membros votaram
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton sessionId={sessionId} />
          <button
            onClick={() => router.push(`/session/${sessionId}/results`)}
            className="px-3 py-2 border border-slate-700 text-slate-400 text-xs font-semibold rounded-xl hover:text-white transition-colors"
          >
            ← Visão membro
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap
              ${tab === t ? 'text-brand-teal border-brand-teal' : 'text-slate-500 border-transparent hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ranking'       && <RankingTab ranking={ranking} />}
      {tab === 'byInitiative'  && <InitiativeVotesTab sessionId={sessionId} ranking={ranking} />}
      {tab === 'participation' && <ParticipationTab sessionId={sessionId} users={users} />}
    </main>
  )
}
