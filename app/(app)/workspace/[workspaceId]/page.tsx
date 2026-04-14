'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, getClientSession } from '@/lib/supabase/client'
import type { InitiativeScore, Session, WorkspaceMember, Workspace, Vote, Initiative } from '@/lib/supabase/client'
import InitiativeCard from '@/components/workspace/InitiativeCard'
import SessionList from '@/components/workspace/SessionList'
import DraftQueue from '@/components/workspace/DraftQueue'
import MembersPanel from '@/components/workspace/MembersPanel'
import CreateInitiativeModal from '@/components/modals/CreateInitiativeModal'
import CreateSessionModal from '@/components/modals/CreateSessionModal'
import WorkspaceSettingsModal from '@/components/modals/WorkspaceSettingsModal'
import Toast from '@/components/ui/Toast'
import Badge from '@/components/ui/Badge'

type Tab = 'backlog' | 'sessions' | 'members'

export default function WorkspacePage() {
  const params        = useParams()
  const router        = useRouter()
  const workspaceId   = params.workspaceId as string

  const [workspace,   setWorkspace]   = useState<Workspace | null>(null)
  const [initiatives, setInitiatives] = useState<InitiativeScore[]>([])
  const [drafts,      setDrafts]      = useState<Initiative[]>([])
  const [sessions,    setSessions]    = useState<Session[]>([])
  const [members,     setMembers]     = useState<WorkspaceMember[]>([])
  const [myVotes,     setMyVotes]     = useState<Record<string, Vote>>({})
  const [myRole,      setMyRole]      = useState<'admin' | 'member' | null>(null)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [tab,         setTab]         = useState<Tab>('backlog')
  const [showCreate,   setShowCreate]   = useState(false)
  const [showSession,  setSession]      = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [toast,        setToast]        = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)

  const load = useCallback(async () => {
    // Verifica sessão local (sem chamada de rede)
    const clientSession = getClientSession()
    if (!clientSession?.user) { router.push('/login'); return }
    setUserId(clientSession.user.id)

    // Busca dados via API route (usa supabaseAdmin no servidor — ignora RLS)
    const res = await fetch(`/api/workspaces/${workspaceId}`)
    if (res.status === 401) { router.push('/login'); return }
    if (res.status === 403 || !res.ok) { router.push('/dashboard'); return }

    const data = await res.json()
    setWorkspace(data.workspace)
    setInitiatives(data.initiatives as InitiativeScore[])
    setDrafts(data.drafts as Initiative[] ?? [])
    setSessions(data.sessions as Session[])
    setMembers(data.members as WorkspaceMember[])
    setMyRole(data.myRole)

    // Votos do usuário (ainda usa cliente browser — votes table pode ter RLS pública ou ser lida via API)
    const supabase = createClient()
    const initIds = (data.initiatives as InitiativeScore[]).map((i) => i.id)
    if (initIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes').select('*').eq('user_id', clientSession.user.id).in('initiative_id', initIds)
      const map: Record<string, Vote> = {}
      votes?.forEach(v => { map[v.initiative_id] = v })
      setMyVotes(map)
    }

    setLoading(false)
  }, [workspaceId, router])

  useEffect(() => { load() }, [load])

  // Realtime — reconecta quando há mudanças
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`ws-${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'initiatives' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [workspaceId, load])

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

  const isAdmin        = myRole === 'admin'
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
        {isAdmin && workspace && (
          <button
            onClick={() => setShowSettings(true)}
            title="Configurações do workspace"
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
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
            {t === 'backlog'
              ? <>Backlog ({initiatives.length}){isAdmin && drafts.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full">{drafts.length}</span>}</>
              : t === 'sessions'
              ? `Sessões (${activeSessions.length})`
              : `Membros (${members.length})`}
          </button>
        ))}
      </div>

      {/* Backlog tab */}
      {tab === 'backlog' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Backlog
            </h2>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 bg-brand-teal text-brand-dark text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors"
            >
              + Nova iniciativa
            </button>
          </div>

          {/* Approval queue (admin only) */}
          {isAdmin && drafts.length > 0 && (
            <DraftQueue drafts={drafts} onRefresh={load} />
          )}

          {initiatives.length === 0 && (
            <div className="rounded-xl border border-slate-800 p-10 flex flex-col items-center gap-3 text-center">
              <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <p className="text-white font-semibold">Nenhuma iniciativa ainda</p>
                <p className="text-slate-500 text-sm mt-1">
                  Adicione iniciativas ao backlog para começar a priorizar com o seu time.
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-1 px-4 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-lg hover:bg-cyan-300 transition-colors"
                >
                  + Nova iniciativa
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
                onDeleted={load}
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
          onDeleted={load}
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
          isAdmin={isAdmin}
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

      {showSettings && workspace && (
        <WorkspaceSettingsModal
          workspace={workspace}
          onClose={() => setShowSettings(false)}
          onUpdated={() => { setShowSettings(false); load() }}
          onDeleted={() => { window.location.href = '/dashboard' }}
        />
      )}
    </main>
  )
}
