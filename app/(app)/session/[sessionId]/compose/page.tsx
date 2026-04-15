'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getClientSession } from '@/lib/supabase/client'

type Initiative = {
  id:          string
  title:       string
  description: string | null
  status:      string
  rice_score:  number | null
  vote_count:  number
  in_session:  boolean
  conflicting: boolean
}

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

type Session = {
  id:           string
  name:         string
  workspace_id: string
  status:       string
  voting_open:  boolean
}

export default function ComposePage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.sessionId as string

  const [session,       setSession]       = useState<Session | null>(null)
  const [backlog,       setBacklog]       = useState<Initiative[]>([])
  const [sessionInits,  setSessionInits]  = useState<SessionInit[]>([])
  const [search,        setSearch]        = useState('')
  const [publishing,    setPublishing]    = useState(false)
  const [pubError,      setPubError]      = useState('')
  const [loading,       setLoading]       = useState(true)
  const [removeModal,   setRemoveModal]   = useState<{ initiativeId: string; title: string; voteCount: number } | null>(null)
  const [removing,      setRemoving]      = useState(false)

  const load = useCallback(async () => {
    const cs = getClientSession()
    if (!cs?.user) { router.replace('/login'); return }

    const sessionRes = await fetch(`/api/sessions/${sessionId}`)
    if (!sessionRes.ok) { router.replace('/dashboard'); return }
    const sessionData = await sessionRes.json()

    const s = sessionData.session as Session
    setSession(s)

    const [backlogRes, sessionInitsRes] = await Promise.all([
      fetch(`/api/workspaces/${s.workspace_id}/initiatives?status=approved&session_id=${sessionId}`),
      fetch(`/api/sessions/${sessionId}/initiatives`),
    ])

    if (backlogRes.ok) {
      const d = await backlogRes.json()
      setBacklog(d.initiatives ?? [])
    }
    if (sessionInitsRes.ok) {
      const d = await sessionInitsRes.json()
      setSessionInits(d.initiatives ?? [])
    }

    setLoading(false)
  }, [sessionId, router])

  useEffect(() => { load() }, [load])

  const isEditable = session && (
    session.status === 'draft' ||
    (session.status === 'open' && !session.voting_open)
  )

  // Filtered backlog
  const filtered = backlog.filter(i =>
    search === '' || i.title.toLowerCase().includes(search.toLowerCase())
  )

  // Session initiatives sorted by position
  const sortedSessionInits = [...sessionInits].sort((a, b) => a.position - b.position)

  async function handleToggle(initiative: Initiative) {
    if (!isEditable) return
    if (initiative.conflicting) return

    if (initiative.in_session) {
      // Remove — check for votes
      await handleRemove(initiative.id, initiative.title)
    } else {
      // Add
      const res = await fetch(`/api/sessions/${sessionId}/initiatives`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ initiative_ids: [initiative.id] }),
      })
      if (res.ok) await load()
    }
  }

  async function handleRemove(initiativeId: string, title: string) {
    const res = await fetch(`/api/sessions/${sessionId}/initiatives/${initiativeId}`, {
      method: 'DELETE',
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.requires_confirmation) {
      setRemoveModal({ initiativeId, title, voteCount: data.vote_count })
    } else {
      await load()
    }
  }

  async function confirmRemove() {
    if (!removeModal) return
    setRemoving(true)
    await fetch(`/api/sessions/${sessionId}/initiatives/${removeModal.initiativeId}/confirm-remove`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ confirmed: true }),
    })
    setRemoving(false)
    setRemoveModal(null)
    await load()
  }

  async function moveUp(idx: number) {
    if (idx === 0) return
    const newOrder = [...sortedSessionInits]
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    await saveOrder(newOrder)
  }

  async function moveDown(idx: number) {
    if (idx === sortedSessionInits.length - 1) return
    const newOrder = [...sortedSessionInits]
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    await saveOrder(newOrder)
  }

  async function saveOrder(ordered: SessionInit[]) {
    const order = ordered.map((item, idx) => ({
      initiative_id: item.initiative_id,
      position:      idx,
    }))
    // Optimistic update
    setSessionInits(ordered.map((item, idx) => ({ ...item, position: idx })))
    await fetch(`/api/sessions/${sessionId}/initiatives/order`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ order }),
    })
  }

  async function publish() {
    setPubError('')
    setPublishing(true)
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'open' }),
    })
    setPublishing(false)
    if (!res.ok) {
      const d = await res.json()
      setPubError(d.error ?? 'Erro ao publicar.')
      return
    }
    router.push(`/session/${sessionId}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  if (!session) return null

  const scoreColor = (s: number | null) =>
    s == null ? 'text-slate-500' :
    s >= 50   ? 'text-emerald-400' :
    s >= 20   ? 'text-yellow-400'  : 'text-red-400'

  return (
    <main className="min-h-screen bg-brand-dark p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/session/${sessionId}`} className="text-xs text-slate-500 hover:text-brand-teal transition-colors">
              ← {session.name}
            </Link>
            <h1 className="text-xl font-bold text-white mt-1">Composição da sessão</h1>
          </div>
          {session.status === 'draft' && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={publish}
                disabled={publishing || sortedSessionInits.length === 0}
                title={sortedSessionInits.length === 0 ? 'Adicione pelo menos uma iniciativa para publicar.' : undefined}
                className="px-5 py-2 rounded-xl bg-brand-teal text-brand-dark text-sm font-semibold hover:bg-cyan-300 transition-colors disabled:opacity-40"
              >
                {publishing ? 'Publicando…' : 'Publicar sessão →'}
              </button>
              {pubError && <p className="text-xs text-red-400">{pubError}</p>}
            </div>
          )}
        </div>

        {/* Read-only warning */}
        {!isEditable && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-900/20 border border-amber-500/20 text-sm text-amber-400">
            <span>⏸</span>
            <span>
              {session.voting_open
                ? 'Votação em andamento. Pause a votação para editar a lista.'
                : 'Sessão encerrada ou arquivada. Somente leitura.'}
            </span>
          </div>
        )}

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT — Workspace backlog */}
          <div className="rounded-2xl border border-slate-800 bg-brand-mid flex flex-col" style={{ minHeight: 500 }}>
            <div className="p-4 border-b border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Backlog do workspace
              </h2>
              <input
                type="text"
                placeholder="Buscar iniciativa…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-8">Nenhuma iniciativa encontrada.</p>
              )}
              {filtered.map(init => {
                const inSession  = init.in_session
                const conflict   = init.conflicting
                const disabled   = !isEditable || conflict

                return (
                  <button
                    key={init.id}
                    onClick={() => !disabled && handleToggle(init)}
                    disabled={disabled}
                    title={conflict ? 'Esta iniciativa está em votação ativa em outra sessão.' : undefined}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
                      ${disabled    ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800/60 cursor-pointer'}
                      ${inSession && !conflict ? 'bg-violet-900/20 border border-violet-500/20' : 'border border-transparent'}`}
                  >
                    {/* Checkbox */}
                    <div className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                      ${inSession && !conflict ? 'bg-violet-600 border-violet-500' : 'border-slate-600 bg-slate-900'}`}>
                      {inSession && !conflict && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200 leading-tight">{init.title}</span>
                        {conflict && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-500/20 shrink-0">
                            ⚠ Em outra sessão ativa
                          </span>
                        )}
                      </div>
                      {init.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{init.description}</p>
                      )}
                    </div>

                    {/* Score */}
                    <span className={`text-sm font-black shrink-0 tabular-nums ${scoreColor(init.rice_score)}`}>
                      {init.rice_score != null ? init.rice_score : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT — Session initiatives */}
          <div className="rounded-2xl border border-slate-800 bg-brand-mid flex flex-col" style={{ minHeight: 500 }}>
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Nesta sessão ({sortedSessionInits.length} iniciativa{sortedSessionInits.length !== 1 ? 's' : ''})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Ordem de votação</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sortedSessionInits.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-8">
                  Nenhuma iniciativa adicionada.<br />
                  <span className="text-xs">Selecione do backlog ao lado.</span>
                </p>
              )}
              {sortedSessionInits.map((item, idx) => {
                const init    = item.initiatives
                const score = init?.rice_score ?? null

                return (
                  <div
                    key={item.initiative_id}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50"
                  >
                    {/* Position number */}
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                      {idx + 1}
                    </span>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 leading-tight truncate">
                        {init?.title ?? '—'}
                      </p>
                    </div>

                    {/* Score */}
                    <span className={`text-sm font-black tabular-nums shrink-0 ${scoreColor(score)}`}>
                      {score != null ? score : '—'}
                    </span>

                    {/* Reorder buttons */}
                    {isEditable && (
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === sortedSessionInits.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-20"
                        >
                          ▼
                        </button>
                      </div>
                    )}

                    {/* Remove */}
                    {isEditable && (
                      <button
                        onClick={() => handleRemove(item.initiative_id, init?.title ?? '')}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors shrink-0 text-xs"
                        title="Remover"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Remove with votes confirmation modal */}
      {removeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-brand-mid border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Remover iniciativa?</h3>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">{removeModal.title}</span> tem{' '}
              <span className="font-semibold text-amber-400">{removeModal.voteCount} voto{removeModal.voteCount !== 1 ? 's' : ''}</span>{' '}
              nesta sessão. Remover apagará esses votos. Continuar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveModal(null)}
                disabled={removing}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRemove}
                disabled={removing}
                className="flex-1 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {removing ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
