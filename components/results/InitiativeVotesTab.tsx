'use client'

import { useEffect, useState } from 'react'
import { riceColor } from '@/lib/rice'

type IndividualVote = {
  id: string; reach: number; impact: number; confidence: number
  effort: number; comment: string | null; created_at: string
  profiles: { id: string; name: string } | null
}

type Stats = {
  reach_min: number; reach_max: number; reach_avg: number; reach_stddev: number
  impact_min: number; impact_max: number; impact_avg: number; impact_stddev: number
  confidence_min: number; confidence_max: number; confidence_avg: number; confidence_stddev: number
  effort_min: number; effort_max: number; effort_avg: number; effort_stddev: number
  vote_count: number
}

type RankItem = {
  id: string; title: string; rice_score: number | null; vote_count: number
}

export default function InitiativeVotesTab({
  sessionId,
  ranking,
}: {
  sessionId: string
  ranking:   RankItem[]
}) {
  const [selected, setSelected]  = useState(ranking[0]?.id ?? '')
  const [votes,    setVotes]     = useState<IndividualVote[]>([])
  const [stats,    setStats]     = useState<Stats | null>(null)
  const [loading,  setLoading]   = useState(false)

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    fetch(`/api/sessions/${sessionId}/results/votes/${selected}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setVotes(d.votes); setStats(d.stats) }
        setLoading(false)
      })
  }, [selected, sessionId])

  return (
    <div className="space-y-4">
      {/* Initiative selector */}
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-teal"
      >
        {ranking.map(r => (
          <option key={r.id} value={r.id}>
            {r.title} — RICE {r.rice_score ?? '—'} ({r.vote_count} votos)
          </option>
        ))}
      </select>

      {loading ? (
        <div className="py-6 text-center text-slate-500 text-sm">Carregando…</div>
      ) : (
        <>
          {/* Dispersion stats */}
          {stats && stats.vote_count > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { label: 'Alcance',   min: stats.reach_min,      max: stats.reach_max,      avg: stats.reach_avg,      std: stats.reach_stddev,      unit: '%',  color: 'text-violet-400' },
                { label: 'Impacto',   min: stats.impact_min,     max: stats.impact_max,     avg: stats.impact_avg,     std: stats.impact_stddev,     unit: '',   color: 'text-sky-400'    },
                { label: 'Confiança', min: stats.confidence_min, max: stats.confidence_max, avg: stats.confidence_avg, std: stats.confidence_stddev, unit: '',   color: 'text-emerald-400'},
                { label: 'Esforço',   min: stats.effort_min,     max: stats.effort_max,     avg: stats.effort_avg,     std: stats.effort_stddev,     unit: 'pm', color: 'text-amber-400'  },
              ] as { label: string; min: number; max: number; avg: number; std: number; unit: string; color: string }[]).map(f => (
                <div key={f.label} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                  <p className={`text-xs font-semibold ${f.color}`}>{f.label}</p>
                  <p className="text-base font-bold text-white">{f.avg}{f.unit}</p>
                  <p className="text-xs text-slate-500">
                    {f.min}–{f.max} · σ {f.std > 0 ? f.std : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Individual votes */}
          {votes.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhum voto para esta iniciativa.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Membro</th>
                    <th className="text-center px-3 py-2.5">Alcance</th>
                    <th className="text-center px-3 py-2.5">Impacto</th>
                    <th className="text-center px-3 py-2.5">Confiança</th>
                    <th className="text-center px-3 py-2.5">Esforço</th>
                    <th className="text-center px-3 py-2.5">Score</th>
                    <th className="text-left px-3 py-2.5">Comentário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {votes.map(v => {
                    const score = v.effort > 0
                      ? Math.round((v.reach * v.impact * v.confidence) / v.effort * 10) / 10
                      : null
                    return (
                      <tr key={v.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 text-white">{v.profiles?.name ?? '—'}</td>
                        <td className="text-center px-3 py-2.5 text-violet-400">{v.reach}%</td>
                        <td className="text-center px-3 py-2.5 text-sky-400">{v.impact}</td>
                        <td className="text-center px-3 py-2.5 text-emerald-400">{Math.round(v.confidence * 100)}%</td>
                        <td className="text-center px-3 py-2.5 text-amber-400">{v.effort}</td>
                        <td className={`text-center px-3 py-2.5 font-bold ${riceColor(score)}`}>{score ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs max-w-xs truncate">{v.comment ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
