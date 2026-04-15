'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, getClientSession } from '@/lib/supabase/client'
import ProgressBar          from '@/components/voting/ProgressBar'
import VoteCard             from '@/components/voting/VoteCard'
import ParticipationIndicator from '@/components/voting/ParticipationIndicator'
import type { InitiativeScore } from '@/lib/supabase/client'
import type { VoteFields } from '@/components/voting/VoteCard'

type SessionData = {
  session:     { id: string; name: string; workspace_id: string; voting_open: boolean }
  initiatives: InitiativeScore[]
  myVotes:     Record<string, { reach: number; impact: number; confidence: number; effort: number; comment: string | null }>
}

const DRAFT_KEY = (sessionId: string, userId: string) =>
  `rice_draft_${sessionId}_${userId}`

export default function VoteIndexPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string
  const idx       = Number(params.index)

  const [data,        setData]        = useState<SessionData | null>(null)
  const [userId,      setUserId]      = useState('')
  const [saving,      setSaving]      = useState(false)
  const [voterCount,  setVoterCount]  = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [votingClosed, setVotingClosed] = useState(false)
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    const cs = getClientSession()
    if (!cs?.user) { router.replace('/login'); return }
    setUserId(cs.user.id)

    const res = await fetch(`/api/sessions/${sessionId}`)
    if (res.status === 401) { router.replace('/login'); return }
    if (!res.ok)            { router.replace('/dashboard'); return }

    const d = await res.json()
    if (!d.session.voting_open) { setVotingClosed(true); setLoading(false); return }

    // Rebuild myVotes map keyed by initiative_id
    const mv: SessionData['myVotes'] = {}
    ;(d.myVotes as { initiative_id: string; reach: number; impact: number; confidence: number; effort: number; comment: string | null }[])
      .forEach(v => { mv[v.initiative_id] = v })

    setData({ session: d.session, initiatives: d.initiatives, myVotes: mv })
    setVoterCount(d.voterCount ?? 0)
    setMemberCount(d.memberCount ?? 0)
    setLoading(false)
  }, [sessionId, router])

  useEffect(() => { load() }, [load])

  // Realtime: watch voting_open changes + vote inserts for participation counter
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`vote-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, payload => {
        if (payload.new && !(payload.new as { voting_open: boolean }).voting_open) {
          setVotingClosed(true)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => {
        // Refresh participation count only
        fetch(`/api/sessions/${sessionId}`).then(r => r.ok ? r.json() : null).then(d => {
          if (d) {
            setVoterCount(d.voterCount ?? 0)
            setMemberCount(d.memberCount ?? 0)
          }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId])

  function getDraftForIdx(index: number): Partial<VoteFields> | undefined {
    if (!data) return undefined
    const key   = DRAFT_KEY(sessionId, userId)
    const saved = localStorage.getItem(key)
    if (!saved) return undefined
    const parsed = JSON.parse(saved)
    if (parsed.index !== index) return undefined
    return parsed.fields
  }

  function saveDraft(index: number, fields: VoteFields) {
    if (!userId) return
    localStorage.setItem(DRAFT_KEY(sessionId, userId), JSON.stringify({ index, fields }))
  }

  function clearDraft() {
    if (!userId) return
    localStorage.removeItem(DRAFT_KEY(sessionId, userId))
  }

  async function handleConfirm(fields: VoteFields) {
    if (!data) return
    const initiative = data.initiatives[idx]
    setSaving(true)

    const res = await fetch('/api/votes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        initiative_id: initiative.id,
        session_id:    sessionId,
        reach:         fields.reach,
        impact:        fields.impact,
        confidence:    fields.confidence / 100,   // store as 0–1
        effort:        fields.effort,
        comment:       fields.comment || null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      // Keep fields — user can retry
      return
    }

    const isLast = idx === data.initiatives.length - 1
    if (isLast) {
      clearDraft()
      router.push(`/session/${sessionId}/vote/done`)
    } else {
      router.push(`/session/${sessionId}/vote/${idx + 1}`)
    }
  }

  function handlePrev() {
    if (idx === 0) {
      router.push(`/session/${sessionId}/vote/briefing`)
    } else {
      router.push(`/session/${sessionId}/vote/${idx - 1}`)
    }
  }

  // ── Voting closed mid-session ────────────────────────────────
  if (votingClosed) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      <div className="bg-brand-mid border border-amber-500/30 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <span className="text-3xl">⏸</span>
        <h2 className="text-lg font-bold text-white">Votação encerrada</h2>
        <p className="text-slate-400 text-sm">
          O administrador encerrou a votação. Seus votos já confirmados foram salvos.
        </p>
        <button
          onClick={() => data && router.push(`/workspace/${data.session.workspace_id}`)}
          className="w-full px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
        >
          Voltar ao workspace
        </button>
      </div>
    </div>
  )

  if (loading || !data) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  const initiatives = data.initiatives
  if (idx >= initiatives.length || idx < 0) {
    router.replace(`/session/${sessionId}/vote/0`)
    return null
  }

  const initiative = initiatives[idx]
  const existingVote = data.myVotes[initiative.id]

  // Prefill from existing vote (confidence stored as 0–1, display as %)
  const initial: Partial<VoteFields> | undefined = getDraftForIdx(idx) ?? (existingVote ? {
    reach:      existingVote.reach,
    impact:     existingVote.impact,
    confidence: Math.round(existingVote.confidence * 100),
    effort:     existingVote.effort,
    comment:    existingVote.comment ?? '',
  } : undefined)

  return (
    <div className="min-h-screen bg-brand-dark p-4">
      <div className="max-w-xl mx-auto space-y-5 pt-6">
        {/* Progress */}
        <ProgressBar current={idx} total={initiatives.length} />

        {/* Participation */}
        <ParticipationIndicator voted={voterCount} total={memberCount} />

        {/* Vote card */}
        <div className="rounded-2xl border border-slate-800 bg-brand-mid p-5">
          <VoteCard
            initiative={initiative}
            sessionId={sessionId}
            initial={initial}
            onDraftChange={f => saveDraft(idx, f)}
            onConfirm={handleConfirm}
            onPrev={handlePrev}
            isFirst={idx === 0}
            isLast={idx === initiatives.length - 1}
            saving={saving}
          />
        </div>
      </div>
    </div>
  )
}
