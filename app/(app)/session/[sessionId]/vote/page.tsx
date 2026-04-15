'use client'

// Entry point: check for saved draft → redirect to draft/ or briefing/
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getClientSession } from '@/lib/supabase/client'

export default function VoteEntryPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  useEffect(() => {
    const session = getClientSession()
    if (!session?.user) { router.replace('/login'); return }

    const userId  = session.user.id
    const key     = `rice_draft_${sessionId}_${userId}`
    const saved   = localStorage.getItem(key)

    if (saved) {
      router.replace(`/session/${sessionId}/vote/draft`)
    } else {
      router.replace(`/session/${sessionId}/vote/briefing`)
    }
  }, [sessionId, router])

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Carregando…
    </div>
  )
}
