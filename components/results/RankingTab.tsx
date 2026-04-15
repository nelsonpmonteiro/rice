'use client'

import { riceColor } from '@/lib/rice'

type RankItem = {
  id: string; title: string; description?: string | null
  rice_score: number | null; reach: number | null; impact: number | null
  confidence: number | null; effort: number | null; vote_count: number
  has_override: boolean
}

export default function RankingTab({ ranking }: { ranking: RankItem[] }) {
  if (ranking.length === 0) return (
    <p className="text-slate-500 text-sm text-center py-6">Nenhuma iniciativa encontrada.</p>
  )

  return (
    <div className="space-y-2">
      {ranking.map((item, idx) => (
        <div key={item.id} className="rounded-xl border border-slate-800 bg-brand-mid px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-slate-600 font-mono text-sm w-6 shrink-0 mt-0.5">#{idx + 1}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-white">{item.title}</p>
                {item.has_override && (
                  <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-500/20">⚡ ajuste</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="text-violet-400">{item.reach != null ? `${item.reach}%` : '—'}</span>
                <span className="text-sky-400">{item.impact ?? '—'}</span>
                <span className="text-emerald-400">{item.confidence != null ? `${Math.round(item.confidence * 100)}%` : '—'}</span>
                <span className="text-amber-400">{item.effort ?? '—'}</span>
                <span>{item.vote_count} {item.vote_count === 1 ? 'voto' : 'votos'}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-slate-500 mb-0.5">RICE</div>
            <span className={`font-black text-2xl ${riceColor(item.rice_score)}`}>
              {item.rice_score ?? '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
