'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session, Initiative, InitiativeScore } from '@/lib/supabase'
import { IMPACT_OPTIONS, CONFIDENCE_OPTIONS, calcRice } from '@/lib/rice'
import Link from 'next/link'

// ── Sub-components ──────────────────────────────────────────

function ScoreTag({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500 text-sm">sem votos</span>
  const color = value >= 50 ? 'text-emerald-400' : value >= 20 ? 'text-yellow-400' : 'text-red-400'
  return <span className={`font-bold text-lg ${color}`}>{value}</span>
}

function VoteForm({
  initiative,
  participant,
  existingVote,
  votingOpen,
  onVoted,
}: {
  initiative: Initiative
  participant: string
  existingVote: Record<string, number> | null
  votingOpen: boolean
  onVoted: () => void
}) {
  const [reach, setReach]         = useState(existingVote?.reach ?? 10)
  const [impact, setImpact]       = useState(existingVote?.impact ?? 1)
  const [confidence, setConf]     = useState(existingVote?.confidence ?? 0.8)
  const [effort, setEffort]       = useState(existingVote?.effort ?? 1)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  const preview = calcRice(reach, impact, confidence, effort)

  async function submit() {
    if (!votingOpen) return
    setSaving(true)
    const payload = { initiative_id: initiative.id, participant, reach, impact, confidence, effort }
    if (existingVote) {
      await supabase.from('votes').update(payload).eq('initiative_id', initiative.id).eq('participant', participant)
    } else {
      await supabase.from('votes').insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onVoted()
  }

  return (
    <div className="space-y-4 pt-3 border-t border-slate-800">
      {/* Reach */}
      <div>
        <label className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
          Reach — quantos usuários/mês?
        </label>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="number" min={0} value={reach}
            onChange={e => setReach(Number(e.target.value))}
            disabled={!votingOpen}
            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
          />
          <span className="text-slate-500 text-xs">ex: 60 clientes/mês</span>
        </div>
      </div>

      {/* Impact */}
      <div>
        <label className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Impact</label>
        <div className="grid grid-cols-5 gap-1.5 mt-1">
          {IMPACT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setImpact(o.value)}
              disabled={!votingOpen}
              title={o.desc}
              className={`py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40
                ${impact === o.value
                  ? 'bg-sky-600 border-sky-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-sky-600'}`}
            >
              {o.value}
            </button>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-1">
          {IMPACT_OPTIONS.find(o => o.value === impact)?.label}: {IMPACT_OPTIONS.find(o => o.value === impact)?.desc}
        </p>
      </div>

      {/* Confidence */}
      <div>
        <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Confidence</label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {CONFIDENCE_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setConf(o.value)}
              disabled={!votingOpen}
              title={o.desc}
              className={`py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40
                ${confidence === o.value
                  ? 'bg-emerald-700 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-600'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Effort */}
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          Effort — pessoas-mês
        </label>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="number" min={0.25} step={0.25} value={effort}
            onChange={e => setEffort(Number(e.target.value))}
            disabled={!votingOpen}
            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
          />
          <span className="text-slate-500 text-xs">ex: 2.5 = 1 dev × 2,5 meses</span>
        </div>
      </div>

      {/* Preview + submit */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-slate-400">
          Preview: <span className="font-bold text-white">{preview}</span>
        </div>
        {votingOpen ? (
          <button
            onClick={submit}
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all
              ${saved
                ? 'bg-emerald-700 text-white'
                : 'bg-brand-teal text-brand-dark hover:bg-cyan-300'}`}
          >
            {saving ? 'Salvando…' : saved ? '✓ Salvo' : existingVote ? 'Atualizar voto' : 'Votar'}
          </button>
        ) : (
          <span className="text-xs text-slate-600 italic">votação encerrada</span>
        )}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────

export default function SessionPage() {
  const params    = useParams()
  const router    = useRouter()
  const slug      = params.slug as string

  const [session, setSession]           = useState<Session | null>(null)
  const [initiatives, setInitiatives]   = useState<InitiativeScore[]>([])
  const [participant, setParticipant]   = useState('')
  const [nameInput, setNameInput]       = useState('')
  const [myVotes, setMyVotes]           = useState<Record<string, Record<string, number>>>({})
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)

  // Try to get logged-in user name first
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (user?.username) {
          setParticipant(user.username)
          localStorage.setItem(`rice_participant_${slug}`, user.username)
        }
      })
      .catch(() => {/* fallback to localStorage below */})
  }, [slug])

  // Load session
  useEffect(() => {
    supabase.from('sessions').select('*').eq('slug', slug).single()
      .then(({ data }) => {
        if (!data) { router.push('/'); return }
        setSession(data)
      })
  }, [slug, router])

  // Load scores (realtime)
  const loadScores = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('initiative_scores')
      .select('*')
      .eq('session_id', session.id)
      .order('rice_score', { ascending: false, nullsFirst: false })
    setInitiatives(data ?? [])
    setLoading(false)
  }, [session])

  useEffect(() => { loadScores() }, [loadScores])

  // Realtime subscription
  useEffect(() => {
    if (!session) return
    const channel = supabase.channel(`session-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, loadScores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, loadScores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        supabase.from('sessions').select('*').eq('id', session.id).single()
          .then(({ data }) => { if (data) setSession(data) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, loadScores])

  // Load my votes
  useEffect(() => {
    if (!participant || !session) return
    supabase.from('votes').select('*').eq('participant', participant)
      .then(({ data }) => {
        const map: Record<string, Record<string, number>> = {}
        data?.forEach(v => { map[v.initiative_id] = v })
        setMyVotes(map)
      })
  }, [participant, session])

  function joinSession() {
    const name = nameInput.trim()
    if (!name) return
    setParticipant(name)
    localStorage.setItem(`rice_participant_${slug}`, name)
  }

  // Restore name from storage
  useEffect(() => {
    const saved = localStorage.getItem(`rice_participant_${slug}`)
    if (saved) setParticipant(saved)
  }, [slug])

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  // Name entry screen
  if (!participant) return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-3xl font-black text-brand-teal">RICE</div>
          <h1 className="text-xl font-bold text-white">{session.name}</h1>
          {session.description && <p className="text-slate-400 text-sm">{session.description}</p>}
        </div>
        <div className="space-y-3">
          <label className="block text-sm text-slate-400">Como quer ser identificado nesta sessão?</label>
          <input
            autoFocus
            type="text"
            placeholder="Seu nome ou apelido"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinSession()}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-teal"
          />
          <button
            onClick={joinSession}
            className="w-full py-3 rounded-xl bg-brand-teal text-brand-dark font-bold hover:bg-cyan-300 transition-colors"
          >
            Entrar na sessão →
          </button>
        </div>
        <p className="text-center text-xs text-slate-600">
          Painel ao vivo: <Link href={`/dashboard/${slug}`} className="text-brand-teal underline">ver sem votar</Link>
        </p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-brand-teal uppercase tracking-widest mb-1">Sessão</div>
            <h1 className="text-2xl font-bold text-white">{session.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">Participando como <span className="text-white font-medium">{participant}</span></p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {session.voting_open ? (
              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-900/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Votação aberta
              </span>
            ) : (
              <span className="text-xs text-slate-600 px-3 py-1 rounded-full border border-slate-800">
                Votação encerrada
              </span>
            )}
            <Link href={`/dashboard/${slug}`} className="text-xs text-slate-500 hover:text-brand-teal transition-colors">
              Ver painel ao vivo →
            </Link>
          </div>
        </div>

        {/* Initiative list */}
        {loading && <p className="text-slate-500 text-sm">Carregando iniciativas…</p>}

        {initiatives.map((init, idx) => {
          const myVote = myVotes[init.id] ?? null
          const isOpen = expanded === init.id
          return (
            <div
              key={init.id}
              className="rounded-xl border border-slate-800 bg-brand-mid overflow-hidden"
            >
              {/* Initiative header */}
              <button
                onClick={() => setExpanded(isOpen ? null : init.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-brand-accent/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 text-sm font-mono w-5">#{idx + 1}</span>
                  <div>
                    <p className="font-semibold text-white">{init.title}</p>
                    {init.description && (
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{init.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Score</div>
                    <ScoreTag value={init.rice_score} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Votos</div>
                    <div className="text-sm text-slate-300 font-medium">{init.vote_count}</div>
                  </div>
                  {myVote && <span className="text-xs text-emerald-400">✓ votei</span>}
                  <span className="text-slate-600 text-lg">{isOpen ? '−' : '+'}</span>
                </div>
              </button>

              {/* Expanded vote form */}
              {isOpen && (
                <div className="px-4 pb-4">
                  {init.has_override && (
                    <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-1.5 mb-3">
                      ⚡ Admin aplicou ajuste manual nesta iniciativa
                      {init.override_note && ` — ${init.override_note}`}
                    </div>
                  )}
                  <VoteForm
                    initiative={init}
                    participant={participant}
                    existingVote={myVote}
                    votingOpen={session.voting_open}
                    onVoted={() => {
                      supabase.from('votes').select('*').eq('participant', participant)
                        .then(({ data }) => {
                          const map: Record<string, Record<string, number>> = {}
                          data?.forEach(v => { map[v.initiative_id] = v })
                          setMyVotes(map)
                        })
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
