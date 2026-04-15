'use client'

import { useEffect, useState } from 'react'
import VoteSummaryTable from '@/components/voting/VoteSummaryTable'

type VoteRow = {
  initiative_id: string; reach: number; impact: number
  confidence: number; effort: number; comment: string | null
  initiatives: { title: string } | null
}

export default function MyVotesTab({ sessionId }: { sessionId: string }) {
  const [votes,   setVotes]   = useState<VoteRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/results/my-votes`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setVotes(d.votes); setLoading(false) } })
  }, [sessionId])

  if (loading) return <div className="py-6 text-center text-slate-500 text-sm">Carregando…</div>
  return <VoteSummaryTable votes={votes} />
}
