'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session, InitiativeScore } from '@/lib/supabase'
import { IMPACT_OPTIONS, CONFIDENCE_OPTIONS } from '@/lib/rice'
import Link from 'next/link'

// ── Create Session Modal ─────────────────────────────────────

function CreateSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]         = useState('')
  const [slug, setSlug]         = useState('')
  const [desc, setDesc]         = useState('')
  const [saving, setSaving]     = useState(false)

  function toSlug(s: string) {
    return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function create() {
    if (!name || !slug) return
    setSaving(true)
    await fetch('/api/admin/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, description: desc }),
    })
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-white">Nova Sessão</h2>

        <div className="space-y-3">
          <input
            autoFocus placeholder="Nome da sessão (ex: Q2 2025 — Estoque)"
            value={name}
            onChange={e => { setName(e.target.value); setSlug(toSlug(e.target.value)) }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm"
          />
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Slug (URL)</label>
            <input
              placeholder="q2-2025-estoque"
              value={slug}
              onChange={e => setSlug(toSlug(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm font-mono"
            />
            <p className="text-xs text-slate-600 mt-1">URL: /session/{slug || '…'}</p>
          </div>
          <textarea
            placeholder="Descrição opcional"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
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

// ── Session detail view ──────────────────────────────────────

function SessionDetail({
  session,
  onBack,
  onRefresh,
}: {
  session: Session
  onBack: () => void
  onRefresh: () => void
}) {
  const [initiatives, setInitiatives] = useState<InitiativeScore[]>([])
  const [newTitle, setNewTitle]       = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [overrideFor, setOverrideFor] = useState<string | null>(null)
  const [ovReach, setOvReach]         = useState('')
  const [ovImpact, setOvImpact]       = useState('')
  const [ovConf, setOvConf]           = useState('')
  const [ovEffort, setOvEffort]       = useState('')
  const [ovNote, setOvNote]           = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('initiative_scores')
      .select('*')
      .eq('session_id', session.id)
      .order('rice_score', { ascending: false, nullsFirst: false })
    setInitiatives(data ?? [])
  }, [session.id])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`admin-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session.id, load])

  async function addInitiative() {
    if (!newTitle.trim()) return
    await fetch('/api/admin/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, title: newTitle, description: newDesc }),
    })
    setNewTitle(''); setNewDesc('')
    load()
  }

  async function toggleVoting() {
    await fetch('/api/admin/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, voting_open: !session.voting_open }),
    })
    onRefresh()
  }

  async function toggleStatus() {
    await fetch('/api/admin/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, status: session.status === 'open' ? 'closed' : 'open' }),
    })
    onRefresh()
  }

  async function applyOverride(initiativeId: string) {
    await fetch('/api/admin/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initiative_id: initiativeId,
        reach:      ovReach      ? Number(ovReach)      : null,
        impact:     ovImpact     ? Number(ovImpact)     : null,
        confidence: ovConf       ? Number(ovConf)       : null,
        effort:     ovEffort     ? Number(ovEffort)     : null,
        note:       ovNote       || null,
      }),
    })
    setOverrideFor(null)
    load()
  }

  async function removeOverride(initiativeId: string) {
    await fetch('/api/admin/overrides', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiative_id: initiativeId }),
    })
    load()
  }

  async function deleteInitiative(id: string) {
    if (!confirm('Remover iniciativa e todos os votos?')) return
    await fetch(`/api/admin/initiatives?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm">← Voltar</button>
        <h2 className="text-xl font-bold text-white">{session.name}</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleVoting}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border
            ${session.voting_open
              ? 'bg-red-900/40 border-red-500/40 text-red-300 hover:bg-red-900/60'
              : 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'}`}
        >
          {session.voting_open ? '⏸ Encerrar votação' : '▶ Abrir votação'}
        </button>
        <button
          onClick={toggleStatus}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          {session.status === 'open' ? 'Arquivar sessão' : 'Reabrir sessão'}
        </button>
        <Link
          href={`/dashboard/${session.slug}`}
          target="_blank"
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10 transition-all"
        >
          Painel ao vivo ↗
        </Link>
        <Link
          href={`/session/${session.slug}`}
          target="_blank"
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          Link da sessão ↗
        </Link>
      </div>

      {/* Add initiative */}
      <div className="rounded-xl border border-slate-800 bg-brand-mid p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Adicionar iniciativa</h3>
        <input
          placeholder="Título da iniciativa"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addInitiative()}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm"
        />
        <input
          placeholder="Descrição (opcional)"
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal text-sm"
        />
        <button
          onClick={addInitiative}
          disabled={!newTitle.trim()}
          className="px-4 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors disabled:opacity-50"
        >
          + Adicionar
        </button>
      </div>

      {/* Initiative list */}
      <div className="space-y-3">
        {initiatives.map((init, idx) => (
          <div key={init.id} className="rounded-xl border border-slate-800 bg-brand-mid overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-slate-600 text-sm font-mono w-5">#{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{init.title}</p>
                    {init.has_override && (
                      <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-500/20">⚡ override</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">{init.vote_count} votos</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Score</div>
                  <div className="text-2xl font-black text-brand-teal">{init.rice_score ?? '—'}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setOverrideFor(init.id === overrideFor ? null : init.id)
                      setOvReach(String(init.reach ?? ''))
                      setOvImpact(String(init.impact ?? ''))
                      setOvConf(String(init.confidence ?? ''))
                      setOvEffort(String(init.effort ?? ''))
                      setOvNote(init.override_note ?? '')
                    }}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition-all text-xs"
                    title="Ajuste manual (override)"
                  >⚡</button>
                  {init.has_override && (
                    <button
                      onClick={() => removeOverride(init.id)}
                      className="p-1.5 rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/50 transition-all text-xs"
                      title="Remover override"
                    >✕</button>
                  )}
                  <button
                    onClick={() => deleteInitiative(init.id)}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/50 transition-all text-xs"
                    title="Deletar iniciativa"
                  >🗑</button>
                </div>
              </div>
            </div>

            {/* Factor display */}
            {(init.vote_count > 0 || init.has_override) && (
              <div className="grid grid-cols-4 gap-px border-t border-slate-800 bg-slate-800">
                {[
                  { label: 'Reach', val: init.reach, color: 'text-violet-400' },
                  { label: 'Impact', val: init.impact, color: 'text-sky-400' },
                  { label: 'Conf.', val: init.confidence, color: 'text-emerald-400' },
                  { label: 'Effort', val: init.effort, color: 'text-amber-400' },
                ].map(f => (
                  <div key={f.label} className="bg-brand-dark p-2 text-center">
                    <div className="text-xs text-slate-600">{f.label}</div>
                    <div className={`font-bold text-sm ${f.color}`}>{f.val ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Override form */}
            {overrideFor === init.id && (
              <div className="p-4 border-t border-slate-800 bg-amber-950/20 space-y-3">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Ajuste manual — Admin Override</p>
                <p className="text-xs text-slate-500">Deixe em branco para manter a média dos votos naquele fator.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-violet-400 mb-1 block">Reach</label>
                    <input type="number" min={0} value={ovReach} onChange={e => setOvReach(e.target.value)}
                      placeholder="ex: 60"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-xs text-sky-400 mb-1 block">Impact</label>
                    <select value={ovImpact} onChange={e => setOvImpact(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500">
                      <option value="">—</option>
                      {IMPACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-emerald-400 mb-1 block">Confidence</label>
                    <select value={ovConf} onChange={e => setOvConf(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500">
                      <option value="">—</option>
                      {CONFIDENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-amber-400 mb-1 block">Effort</label>
                    <input type="number" min={0.25} step={0.25} value={ovEffort} onChange={e => setOvEffort(e.target.value)}
                      placeholder="ex: 2.5"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                </div>

                <input
                  placeholder="Nota explicativa para os participantes (opcional)"
                  value={ovNote}
                  onChange={e => setOvNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => applyOverride(init.id)}
                    className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-500 transition-colors"
                  >
                    Aplicar override
                  </button>
                  <button onClick={() => setOverrideFor(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-white transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main admin dashboard ─────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()
  const [sessions, setSessions]       = useState<Session[]>([])
  const [selected, setSelected]       = useState<Session | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [loading, setLoading]         = useState(true)

  // Use a ref so loadSessions can read the latest selected without depending on it
  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
    setSessions(data ?? [])
    setLoading(false)
    // Refresh selected if one is open
    if (selectedRef.current) {
      const fresh = data?.find(s => s.id === selectedRef.current!.id)
      if (fresh) setSelected(fresh)
    }
  }, []) // no dependency on selected — avoids infinite loop

  useEffect(() => { loadSessions() }, [loadSessions])

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin')
  }

  if (selected) return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <SessionDetail
          session={selected}
          onBack={() => { setSelected(null); loadSessions() }}
          onRefresh={loadSessions}
        />
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-black text-brand-teal">RICE</span>
            <span className="text-slate-500 text-sm ml-3">Admin</span>
          </div>
          <button onClick={logout} className="text-xs text-slate-500 hover:text-white transition-colors">Sair</button>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Sessões</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors"
          >
            + Nova sessão
          </button>
        </div>

        {loading && <p className="text-slate-500 text-sm">Carregando…</p>}

        <div className="space-y-3">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="w-full rounded-xl border border-slate-800 bg-brand-mid p-4 text-left hover:border-brand-teal/50 hover:bg-brand-accent/20 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white group-hover:text-brand-teal transition-colors">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border
                      ${s.status === 'open'
                        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {s.status === 'open' ? 'aberta' : 'arquivada'}
                    </span>
                    {s.voting_open && (
                      <span className="inline-flex items-center gap-1 text-xs bg-brand-teal/20 text-brand-teal px-2 py-0.5 rounded-full border border-brand-teal/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                        votação ativa
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">/session/{s.slug}</p>
                </div>
                <span className="text-slate-600 group-hover:text-brand-teal transition-colors">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={loadSessions}
        />
      )}
    </main>
  )
}
