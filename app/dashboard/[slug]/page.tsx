'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session, InitiativeScore } from '@/lib/supabase'
import { riceColor, riceBg } from '@/lib/rice'
import Link from 'next/link'

function RiceBar({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  const pct = value && max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-300 font-mono">{value ?? '—'}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const params  = useParams()
  const slug    = params.slug as string

  const [session, setSession]         = useState<Session | null>(null)
  const [initiatives, setInitiatives] = useState<InitiativeScore[]>([])
  const [lastUpdate, setLastUpdate]   = useState<Date>(new Date())

  const loadData = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('initiative_scores')
      .select('*')
      .eq('session_id', sessionId)
      .order('rice_score', { ascending: false, nullsFirst: false })
    setInitiatives(data ?? [])
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    supabase.from('sessions').select('*').eq('slug', slug).single()
      .then(({ data }) => {
        if (!data) return
        setSession(data)
        loadData(data.id)
      })
  }, [slug, loadData])

  useEffect(() => {
    if (!session) return
    const channel = supabase.channel(`dashboard-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => loadData(session.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, () => loadData(session.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        supabase.from('sessions').select('*').eq('id', session.id).single()
          .then(({ data }) => { if (data) setSession(data) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, loadData])

  const maxScore = Math.max(...initiatives.map(i => i.rice_score ?? 0), 1)

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>
  )

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl font-black text-brand-teal">RICE</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest">Painel ao vivo</span>
            </div>
            <h1 className="text-xl font-bold text-white">{session.name}</h1>
            <p className="text-slate-500 text-xs mt-1">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {session.voting_open ? (
              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-900/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Votação aberta
              </span>
            ) : (
              <span className="text-xs text-slate-600 px-3 py-1 rounded-full border border-slate-800">Votação encerrada</span>
            )}
            <Link href={`/session/${slug}`} className="text-xs text-slate-500 hover:text-brand-teal transition-colors">
              ← Ir para sessão
            </Link>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Score ≥ 50</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Score 20–49</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Score &lt; 20</span>
        </div>

        {/* Ranked list */}
        <div className="space-y-3">
          {initiatives.length === 0 && (
            <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
              Nenhuma iniciativa nesta sessão ainda.
            </div>
          )}

          {initiatives.map((init, idx) => (
            <div
              key={init.id}
              className={`rounded-xl border p-4 sm:p-5 transition-all ${riceBg(init.rice_score)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-sm font-bold text-slate-400">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{init.title}</p>
                      {init.has_override && (
                        <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-500/20">
                          ⚡ ajuste admin
                        </span>
                      )}
                    </div>
                    {init.description && (
                      <p className="text-slate-400 text-sm mt-0.5">{init.description}</p>
                    )}
                    <p className="text-slate-600 text-xs mt-1">{init.vote_count} {init.vote_count === 1 ? 'voto' : 'votos'}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-500 mb-0.5">Score RICE</div>
                  <div className={`text-3xl font-black ${riceColor(init.rice_score)}`}>
                    {init.rice_score ?? '—'}
                  </div>
                </div>
              </div>

              {/* Factor bars */}
              {(init.vote_count > 0 || init.has_override) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/50">
                  <RiceBar label="Reach" value={init.reach} max={200} color="bg-violet-500" />
                  <RiceBar label="Impact" value={init.impact} max={3} color="bg-sky-500" />
                  <RiceBar label="Confidence" value={init.confidence} max={1} color="bg-emerald-500" />
                  <RiceBar label="Effort" value={init.effort} max={10} color="bg-amber-500" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Score formula reminder */}
        <div className="rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-slate-600 text-xs">
            Score = (Reach × Impact × Confidence) ÷ Effort &nbsp;·&nbsp; Maior score = maior prioridade
          </p>
        </div>
      </div>
    </main>
  )
}
