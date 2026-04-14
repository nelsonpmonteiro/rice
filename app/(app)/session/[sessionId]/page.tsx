'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getClientSession } from '@/lib/supabase/client'
import type { Session, InitiativeScore, Vote } from '@/lib/supabase/client'
import InitiativeCard from '@/components/workspace/InitiativeCard'
import Badge from '@/components/ui/Badge'

export default function SessionPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string
  const supabase  = createClient()

  const [session,     setSession]     = useState<Session | null>(null)
  const [initiatives, setInitiatives] = useState<InitiativeScore[]>([])
  const [myVotes,     setMyVotes]     = useState<Record<string, Vote>>({})
  const [userId,      setUserId]      = useState<string | null>(null)
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    const session = getClientSession()
    const user = session?.user ?? null
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data: ses } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    if (!ses) { router.push('/dashboard'); return }
    setSession(ses)

    // Verificar membership
    const { data: member } = await supabase
      .from('workspace_members').select('role')
      .eq('workspace_id', ses.workspace_id).eq('user_id', user.id).single()
    if (!member) { router.push('/dashboard'); return }
    setIsAdmin(member.role === 'admin')

    const { data: inits } = await supabase
      .from('initiative_scores').select('*').eq('session_id', sessionId)
      .order('rice_score', { ascending: false, nullsFirst: false })
    setInitiatives((inits ?? []) as InitiativeScore[])

    const initIds = (inits ?? []).map((i: InitiativeScore) => i.id)
    if (initIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes').select('*').eq('user_id', user.id).in('initiative_id', initIds)
      const map: Record<string, Vote> = {}
      votes?.forEach(v => { map[v.initiative_id] = v })
      setMyVotes(map)
    }

    setLoading(false)
  }, [sessionId, router, supabase])

  useEffect(() => { load() }, [load])

  // Realtime: atualizar quando votos, overrides ou a sessão mudam
  useEffect(() => {
    const ch = supabase.channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, load, supabase])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  if (!session) return null

  return (
    <main className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-1">Sessão</div>
          <h1 className="text-2xl font-bold text-white">{session.name}</h1>
          {session.description && (
            <p className="text-slate-400 text-sm mt-0.5">{session.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {session.voting_open
            ? <Badge variant="pulse">Votação aberta</Badge>
            : <Badge variant="default">Votação encerrada</Badge>}
          <Link
            href={`/workspace/${session.workspace_id}`}
            className="text-xs text-slate-500 hover:text-brand-teal transition-colors"
          >
            ← Workspace
          </Link>
        </div>
      </div>

      {/* Initiatives */}
      {initiatives.length === 0 && (
        <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
          Nenhuma iniciativa nesta sessão.
        </div>
      )}

      {initiatives.map((init, idx) => (
        <InitiativeCard
          key={init.id}
          initiative={init}
          rank={idx + 1}
          isAdmin={isAdmin}
          votingOpen={session.voting_open}
          myVote={myVotes[init.id] ?? null}
          onRefresh={load}
        />
      ))}
    </main>
  )
}
