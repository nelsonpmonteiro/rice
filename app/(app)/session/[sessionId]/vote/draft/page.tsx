'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getClientSession } from '@/lib/supabase/client'
import DraftRestoreScreen from '@/components/voting/DraftRestoreScreen'

const DRAFT_KEY = (sessionId: string, userId: string) =>
  `rice_draft_${sessionId}_${userId}`

export default function DraftPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  const [draftIndex,   setDraftIndex]   = useState(0)
  const [total,        setTotal]        = useState(0)
  const [sessionName,  setSessionName]  = useState('')
  const [ready,        setReady]        = useState(false)
  const [userId,       setUserId]       = useState('')

  useEffect(() => {
    const cs = getClientSession()
    if (!cs?.user) { router.replace('/login'); return }
    setUserId(cs.user.id)

    const key    = DRAFT_KEY(sessionId, cs.user.id)
    const saved  = localStorage.getItem(key)

    if (!saved) {
      router.replace(`/session/${sessionId}/vote/briefing`)
      return
    }

    const parsed = JSON.parse(saved)

    // Fetch session info for name + total
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { router.replace('/dashboard'); return }
        if (!d.session.voting_open) {
          router.replace(`/workspace/${d.session.workspace_id}`)
          return
        }
        setSessionName(d.session.name)
        setTotal(d.initiatives.length)
        setDraftIndex(parsed.index ?? 0)
        setReady(true)
      })
  }, [sessionId, router])

  function handleContinue() {
    router.push(`/session/${sessionId}/vote/${draftIndex}`)
  }

  function handleRestart() {
    if (userId) {
      localStorage.removeItem(DRAFT_KEY(sessionId, userId))
    }
    router.push(`/session/${sessionId}/vote/briefing`)
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  return (
    <DraftRestoreScreen
      sessionName={sessionName}
      draftIndex={draftIndex}
      total={total}
      onContinue={handleContinue}
      onRestart={handleRestart}
    />
  )
}
