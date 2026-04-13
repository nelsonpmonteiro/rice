'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session, Group, InitiativeScore } from '@/lib/supabase'
import type { AuthUser } from '@/lib/auth'
import Link from 'next/link'

// ── Create Session Modal ──────────────────────────────────────

function CreateSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName]     = useState('')
  const [slug, setSlug]     = useState('')
  const [desc, setDesc]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function toSlug(s: string) {
    return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function create() {
    if (!name || !slug) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, description: desc }),
    })

    if (res.ok) {
      onCreated()
      onClose()
    } else {
      const data = await res.json()
      setError(data.error || 'Erro ao criar sessão.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-white">Nova Sessão de Priorização</h2>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Nome da sessão (ex: Q2 2025)"
            value={name}
            onChange={e => { setName(e.target.value); setSlug(toSlug(e.target.value)) }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm"
          />
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Slug (URL)</label>
            <input
              placeholder="q2-2025"
              value={slug}
              onChange={e => setSlug(toSlug(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm font-mono"
            />
            <p className="text-xs text-slate-600 mt-1">/session/{slug || '…'}</p>
          </div>
          <textarea
            placeholder="Descrição opcional"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm resize-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={create}
            disabled={saving || !name || !slug}
            className="px-5 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {saving ? 'Criando…' : 'Criar sessão'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────

export default function UserDashboard({ user }: { user: AuthUser }) {
  const router = useRouter()
  const [group, setGroup]           = useState<Group | null>(null)
  const [sessions, setSessions]     = useState<Session[]>([])
  const [backlog, setBacklog]       = useState<InitiativeScore[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]       = useState(true)

  const loadData = useCallback(async () => {
    if (!user.group_id) { setLoading(false); return }

    // Group info
    const { data: g } = await supabase.from('groups').select('*').eq('id', user.group_id).single()
    if (g) setGroup(g)

    // Sessions for this group
    const { data: s } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', user.group_id)
      .order('created_at', { ascending: false })

    const sessionList = s ?? []
    setSessions(sessionList)

    // Prioritized backlog — all initiatives from group sessions, sorted by score
    const ids = sessionList.map(x => x.id)
    if (ids.length > 0) {
      const { data: b } = await supabase
        .from('initiative_scores')
        .select('*')
        .in('session_id', ids)
        .order('rice_score', { ascending: false, nullsFirst: false })
      setBacklog(b ?? [])
    } else {
      setBacklog([])
    }

    setLoading(false)
  }, [user.group_id])

  useEffect(() => { loadData() }, [loadData])

  // Realtime: refresh backlog when votes/overrides change
  useEffect(() => {
    if (!user.group_id) return
    const ch = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user.group_id, loadData])

  async function logout() {
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  async function toggleVoting(session: Session) {
    await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, voting_open: !session.voting_open }),
    })
    loadData()
  }

  async function toggleStatus(session: Session) {
    await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, status: session.status === 'open' ? 'closed' : 'open' }),
    })
    loadData()
  }

  const openSessions   = sessions.filter(s => s.status === 'open')
  const closedSessions = sessions.filter(s => s.status === 'closed')

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-brand-teal">RICE</span>
            {group && (
              <span className="text-slate-400 text-sm border border-slate-700 rounded-lg px-2.5 py-0.5">
                {group.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm">
              {user.username}
              {user.role === 'admin' && (
                <span className="ml-1.5 text-xs text-brand-teal bg-brand-teal/10 border border-brand-teal/30 px-1.5 py-0.5 rounded-full">
                  admin
                </span>
              )}
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-600 hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* No group assigned */}
        {!user.group_id && !loading && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-6 text-center space-y-2">
            <p className="text-amber-400 font-semibold">Sem grupo atribuído</p>
            <p className="text-slate-400 text-sm">
              Seu usuário não está vinculado a nenhum grupo. Peça ao administrador para te adicionar a um grupo.
            </p>
          </div>
        )}

        {/* Prioritized Backlog */}
        {user.group_id && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Backlog Priorizado
                {group ? ` — ${group.name}` : ''}
              </h2>
              {backlog.length > 0 && (
                <span className="text-xs text-slate-600">{backlog.length} itens</span>
              )}
            </div>

            {loading && (
              <div className="text-slate-500 text-sm">Carregando…</div>
            )}

            {!loading && backlog.length === 0 && (
              <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
                Nenhum item priorizado ainda.{' '}
                {user.role === 'admin' && 'Crie uma sessão de votação para começar.'}
              </div>
            )}

            {backlog.map((item, idx) => {
              const sessionName = sessions.find(s => s.id === item.session_id)?.name
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-brand-mid overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-slate-600 text-sm font-mono w-6 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{item.title}</p>
                          {item.has_override && (
                            <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                              ⚡ ajuste
                            </span>
                          )}
                        </div>
                        {sessionName && (
                          <p className="text-slate-500 text-xs mt-0.5">{sessionName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <div className="grid grid-cols-4 gap-3 text-center hidden sm:grid">
                        {[
                          { label: 'R', val: item.reach,      color: 'text-violet-400' },
                          { label: 'I', val: item.impact,     color: 'text-sky-400' },
                          { label: 'C', val: item.confidence, color: 'text-emerald-400' },
                          { label: 'E', val: item.effort,     color: 'text-amber-400' },
                        ].map(f => (
                          <div key={f.label}>
                            <div className="text-xs text-slate-600">{f.label}</div>
                            <div className={`text-xs font-bold ${f.color}`}>{f.val ?? '—'}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Score</div>
                        <div className={`text-2xl font-black ${
                          item.rice_score == null ? 'text-slate-600'
                          : item.rice_score >= 50 ? 'text-emerald-400'
                          : item.rice_score >= 20 ? 'text-yellow-400'
                          : 'text-red-400'
                        }`}>
                          {item.rice_score ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* Active Sessions */}
        {user.group_id && openSessions.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Sessões Abertas
              </h2>
              {user.role === 'admin' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-3 py-1.5 bg-brand-teal text-brand-dark text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors"
                >
                  + Nova sessão
                </button>
              )}
            </div>

            {openSessions.map(s => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-800 bg-brand-mid p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{s.name}</p>
                      {s.voting_open && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          votação ativa
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-slate-400 text-xs mt-0.5">{s.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {s.voting_open && (
                      <Link
                        href={`/session/${s.slug}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-teal text-brand-dark hover:bg-cyan-300 transition-colors"
                      >
                        Votar →
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/${s.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      Painel ↗
                    </Link>
                    {user.role === 'admin' && (
                      <>
                        <button
                          onClick={() => toggleVoting(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                            ${s.voting_open
                              ? 'border-red-500/40 text-red-400 hover:bg-red-900/20'
                              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/20'}`}
                        >
                          {s.voting_open ? '⏸ Encerrar votação' : '▶ Abrir votação'}
                        </button>
                        <button
                          onClick={() => toggleStatus(s)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-500 hover:text-white transition-colors"
                        >
                          Arquivar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Empty state + create button when no sessions exist */}
        {user.group_id && !loading && openSessions.length === 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Sessões
              </h2>
              {user.role === 'admin' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-3 py-1.5 bg-brand-teal text-brand-dark text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors"
                >
                  + Nova sessão
                </button>
              )}
            </div>
            {sessions.length === 0 && (
              <div className="rounded-xl border border-slate-800 p-6 text-center text-slate-500 text-sm">
                Nenhuma sessão aberta.{' '}
                {user.role === 'admin' && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-brand-teal hover:underline"
                  >
                    Criar a primeira sessão →
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Archived Sessions */}
        {user.role === 'admin' && closedSessions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              Sessões Arquivadas
            </h2>
            {closedSessions.map(s => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-800 bg-brand-mid/50 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-slate-400 text-sm font-medium">{s.name}</p>
                  {s.description && <p className="text-slate-600 text-xs mt-0.5">{s.description}</p>}
                </div>
                <div className="flex gap-1.5">
                  <Link
                    href={`/dashboard/${s.slug}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-500 hover:text-white transition-colors"
                  >
                    Painel ↗
                  </Link>
                  <button
                    onClick={() => toggleStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    Reabrir
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

      </div>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={loadData}
        />
      )}
    </main>
  )
}
