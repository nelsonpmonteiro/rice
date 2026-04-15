'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getClientSession } from '@/lib/supabase/client'
import RankingTab  from '@/components/results/RankingTab'
import MyVotesTab  from '@/components/results/MyVotesTab'

type Tab = 'ranking' | 'myVotes'

export default function ResultsPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  const [tab,          setTab]          = useState<Tab>('ranking')
  const [ranking,      setRanking]      = useState<unknown[]>([])
  const [sessionName,  setSessionName]  = useState('')
  const [myRole,       setMyRole]       = useState('')
  const [voterCount,   setVoterCount]   = useState(0)
  const [memberCount,  setMemberCount]  = useState(0)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    const cs = getClientSession()
    if (!cs?.user) { router.replace('/login'); return }

    fetch(`/api/sessions/${sessionId}/results`)
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null }
        if (!r.ok)            { router.replace('/dashboard'); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setRanking(d.ranking)
        setSessionName(d.session.name)
        setMyRole(d.myRole)
        setVoterCount(d.voterCount)
        setMemberCount(d.memberCount)
        setLoading(false)
      })
  }, [sessionId, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  return (
    <main className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-1">Resultados</div>
          <h1 className="text-2xl font-bold text-white">{sessionName}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {voterCount} de {memberCount} membros votaram
          </p>
        </div>
        {myRole === 'admin' && (
          <button
            onClick={() => router.push(`/session/${sessionId}/results/admin`)}
            className="px-3 py-1.5 border border-brand-teal/40 text-brand-teal text-xs font-semibold rounded-lg hover:bg-brand-teal/10 transition-colors"
          >
            Visão admin →
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {([['ranking', 'Ranking'], ['myVotes', 'Meus votos']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${tab === t ? 'text-brand-teal border-brand-teal' : 'text-slate-500 border-transparent hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ranking' && <RankingTab ranking={ranking as Parameters<typeof RankingTab>[0]['ranking']} />}
      {tab === 'myVotes' && <MyVotesTab sessionId={sessionId} />}
    </main>
  )
}
