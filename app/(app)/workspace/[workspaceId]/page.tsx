'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, getClientSession } from '@/lib/supabase/client'
import type { InitiativeScore, Session, WorkspaceMember, Workspace, Vote } from '@/lib/supabase/client'
import InitiativeCard from '@/components/workspace/InitiativeCard'
import SessionList from '@/components/workspace/SessionList'
import MembersPanel from '@/components/workspace/MembersPanel'
import CreateInitiativeModal from '@/components/modals/CreateInitiativeModal'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'

type Tab = 'backlog' | 'sessions' | 'members'

export default function WorkspacePage() {
  const params        = useParams()
  const router        = useRouter()
  const workspaceId   = params.workspaceId as string
  const supabase      = createClient()

  const [workspace,   setWorkspace]   = useState<Workspace | null>(null)
  const [initiatives, setInitiatives] = useState<InitiativeScore[]>([])
  const [sessions,    setSessions]    = useState<Session[]>([])
  const [members,     setMembers]     = useState<WorkspaceMember[]>([])
  const [myVotes,     setMyVotes]     = useState<Record<string, Vote>>({})
  const [myRole,      setMyRole]      = useState<'admin' | 'member' | null>(null)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [tab,         setTab]         = useState<Tab>('backlog')
  const [showCreate,  setShowCreate]  = useState(false)
  const [showSession, setSession]     = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    const session = getClientSession()
    const user = session?.user ?? null
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const [wsRes, initRes, sesRes, memRes] = await Promise.all([
      supabase.from('workspaces').select('*').eq('id', workspaceId).single(),
      supabase.from('initiative_scores').select('*').eq('workspace_id', workspaceId)
        .order('rice_score', { ascending: false, nullsFirst: false }),
      supabase.from('sessions').select('*').eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase.from('workspace_members')
        .select('*, profiles(id, name)')
        .eq('workspace_id', workspaceId),
    ])

    if (!wsRes.data) { router.push('/dashboard'); return }

    setWorkspace(wsRes.data)
    setInitiatives((initRes.data ?? []) as InitiativeScore[])
    setSessions(sesRes.data ?? [])
    setMembers((memRes.data ?? []) as unknown as WorkspaceMember[])

    const me = memRes.data?.find(m => m.user_id === user.id)
    setMyRole(me?.role ?? null)
    if (!me) { router.push('/dashboard'); return } // não é membro

    // Votos do usuário
    const initIds = (initRes.data ?? []).map((i: InitiativeScore) => i.id)
    if (initIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes').select('*').eq('user_id', user.id).in('initiative_id', initIds)
      const map: Record<string, Vote> = {}
      votes?.forEach(v => { map[v.initiative_id] = v })
      setMyVotes(map)
    }

    setLoading(false)
  }, [workspaceId, router, supabase])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`ws-${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'initiatives' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [workspaceId, load, supabase])

  async function toggleVoting(session: Session) {
    await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voting_open: !session.voting_open }),
    })
    load()
  }

  async function toggleStatus(session: Session) {
    await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: session.status === 'open' ? 'closed' : 'open' }),
    })
    load()
  }

  const isAdmin      = myRole === 'admin'
  const activeSessions = sessions.filter(s => s.status === 'open')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  return (
    <main className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{workspace?.name}</h1>
            <Badge variant={isAdmin ? 'teal' : 'default'}>{isAdmin ? 'Admin' : 'Membro'}</Badge>
          </div>
          {workspace?.description && (
            <p className="text-slate-400 text-sm mt-0.5">{workspace.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {(['backlog', 'sessions', 'members'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${tab === t
                ? 'text-brand-teal border-brand-teal'
                : 'text-slate-500 border-transparent hover:text-white'}`}
          >
            {t === 'backlog' ? `Backlog (${initiatives.length})` : t === 'sessions' ? `Sessões (${activeSessions.length})` : `Membros (${members.length})`}
          </button>
        ))}
      </div>

      {/* Backlog tab */}
      {tab === 'backlog' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Iniciativas priorizadas
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-3 py-1.5 bg-brand-teal text-brand-dark text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors"
              >
                + Iniciativa
              </button>
            )}
          </div>

          {initiatives.length === 0 && (
            <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
              Nenhuma iniciativa ainda.{' '}
              {isAdmin && (
                <button onClick={() => setShowCreate(true)} className="text-brand-teal hover:underline">
                  Adicionar a primeira →
                </button>
              )}
            </div>
          )}

          {initiatives.map((init, idx) => {
            const votingOpen = sessions.find(s => s.id === init.session_id)?.voting_open ?? false
            return (
              <InitiativeCard
                key={init.id}
                initiative={init}
                rank={idx + 1}
                isAdmin={isAdmin}
                votingOpen={votingOpen}
                myVote={myVotes[init.id] ?? null}
                onRefresh={load}
              />
            )
          })}
        </section>
      )}

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <SessionList
          sessions={sessions}
          isAdmin={isAdmin}
          onToggleVoting={toggleVoting}
          onToggleStatus={toggleStatus}
          onCreateSession={() => setSession(true)}
        />
      )}

      {/* Members tab */}
      {tab === 'members' && userId && (
        <MembersPanel
          workspaceId={workspaceId}
          members={members}
          currentUserId={userId}
          isAdmin={isAdmin}
          onRefresh={load}
        />
      )}

      {/* Modals */}
      {showCreate && (
        <CreateInitiativeModal
          workspaceId={workspaceId}
          sessions={sessions}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
      {showSession && (
        <CreateSessionModal
          workspaceId={workspaceId}
          onClose={() => setSession(false)}
          onCreated={() => { setSession(false); load() }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  )
}
