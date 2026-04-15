'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getClientSession } from '@/lib/supabase/client'
import type { Session } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import SessionControlPanel from '@/components/session/SessionControlPanel'

type SessionInit = {
  initiative_id: string
  position:      number
  initiatives: {
    id:          string
    title:       string
    description: string | null
    rice_score:  number | null
  } | null
}

type Summary = {
  member_count: number
  voted_count:  number
  not_voted:    { name: string; email: string }[]
}

export default function SessionPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  const [session,      setSession]      = useState<Session | null>(null)
  const [sessionInits, setSessionInits] = useState<SessionInit[]>([])
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [voterCount,   setVoterCount]   = useState(0)
  const [memberCount,  setMemberCount]  = useState(0)
  const [notVoted,     setNotVoted]     = useState<{ name: string; email: string }[]>([])
  const [loading,      setLoading]      = useState(true)

  const loadSummary = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/summary`)
    if (!res.ok) return
    const s: Summary = await res.json()
    setVoterCount(s.voted_count)
    setMemberCount(s.member_count)
    setNotVoted(s.not_voted)
  }, [sessionId])

  const load = useCallback(async () => {
    const clientSession = getClientSession()
    if (!clientSession?.user) { router.push('/login'); return }

    const res = await fetch(`/api/sessions/${sessionId}`)
    if (res.status === 401) { router.push('/login'); return }
    if (res.status === 403 || res.status === 404 || !res.ok) { router.push('/dashboard'); return }

    const data = await res.json()
    const s = data.session as Session
    setSession(s)
    setIsAdmin(data.myRole === 'admin')
    setVoterCount(data.voterCount  ?? 0)
    setMemberCount(data.memberCount ?? 0)

    // Load session-specific initiatives (ordered by position)
    const sinitsRes = await fetch(`/api/sessions/${sessionId}/initiatives`)
    if (sinitsRes.ok) {
      const d = await sinitsRes.json()
      setSessionInits((d.initiatives ?? []).sort(
        (a: SessionInit, b: SessionInit) => a.position - b.position
      ))
    }

    if (data.myRole === 'admin') {
      await loadSummary()
    }

    setLoading(false)
  }, [sessionId, router, loadSummary])

  useEffect(() => { load() }, [load])

  // Realtime — refresh on session changes + vote inserts
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`session-page-${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, load])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  if (!session) return null

  const scoreColor = (s: number | null) =>
    s == null ? 'text-slate-500' :
    s >= 50   ? 'text-emerald-400' :
    s >= 20   ? 'text-yellow-400'  : 'text-red-400'

  const statusLabel =
    session.status === 'draft'    ? 'Rascunho'  :
    session.voting_open           ? 'Votação aberta' :
    session.status === 'closed'   ? 'Encerrada'  :
    session.status === 'archived' ? 'Arquivada'  : 'Publicada'

  const sessionWithDesc = session as Session & { description?: string }

  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-1">Sessão</div>
          <h1 className="text-2xl font-bold text-white">{session.name}</h1>
          {sessionWithDesc.description && (
            <p className="text-slate-400 text-sm mt-0.5">{sessionWithDesc.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {session.voting_open
            ? <Badge variant="pulse">Votação aberta</Badge>
            : <Badge variant="default">{statusLabel}</Badge>}
          <Link
            href={`/workspace/${session.workspace_id}`}
            className="text-xs text-slate-500 hover:text-brand-teal transition-colors"
          >
            ← Workspace
          </Link>
        </div>
      </div>

      <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-3' : ''}`}>
        {/* Initiatives list */}
        <div className={`space-y-3 ${isAdmin ? 'lg:col-span-2' : ''}`}>
          {/* Vote button — visible for everyone (including admin) when voting is open */}
          {session.voting_open && (
            <Link
              href={`/session/${sessionId}/vote/briefing`}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-teal text-brand-dark font-semibold text-sm hover:bg-cyan-300 transition-colors"
            >
              Votar agora →
            </Link>
          )}

          {sessionInits.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
              {isAdmin
                ? <>Nenhuma iniciativa adicionada.{' '}
                    <Link href={`/session/${sessionId}/compose`} className="text-brand-teal hover:underline">
                      Adicionar iniciativas →
                    </Link>
                  </>
                : 'Nenhuma iniciativa nesta sessão ainda.'}
            </div>
          ) : (
            sessionInits.map((item, idx) => {
              const init  = item.initiatives
              const score = init?.rice_score ?? null

              return (
                <div
                  key={item.initiative_id}
                  className="rounded-xl border border-slate-800 bg-brand-mid p-4 flex items-start gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight">{init?.title ?? '—'}</p>
                    {init?.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{init.description}</p>
                    )}
                  </div>
                  {score != null && (
                    <span className={`text-lg font-black tabular-nums shrink-0 ${scoreColor(score)}`}>
                      {score}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Admin control panel */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <SessionControlPanel
              session={{
                id:           session.id,
                name:         session.name,
                workspace_id: session.workspace_id,
                status:       session.status,
                voting_open:  session.voting_open,
              }}
              voterCount={voterCount}
              memberCount={memberCount}
              notVoted={notVoted}
              onRefresh={load}
            />
          </div>
        )}
      </div>
    </main>
  )
}
