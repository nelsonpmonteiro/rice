'use client'

import { calcRice, riceColor } from '@/lib/rice'

type VoteRow = {
  initiative_id: string
  reach:         number
  impact:        number
  confidence:    number   // 0–1 decimal
  effort:        number
  comment:       string | null
  initiatives:   { title: string } | null
}

export default function VoteSummaryTable({ votes }: { votes: VoteRow[] }) {
  if (votes.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-4">Nenhum voto registrado nesta sessão.</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
            <th className="text-left px-4 py-2.5">Iniciativa</th>
            <th className="text-center px-3 py-2.5">Alcance</th>
            <th className="text-center px-3 py-2.5">Impacto</th>
            <th className="text-center px-3 py-2.5">Confiança</th>
            <th className="text-center px-3 py-2.5">Esforço</th>
            <th className="text-center px-3 py-2.5">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {votes.map(v => {
            const score = calcRice(v.reach, v.impact, v.confidence, v.effort)
            return (
              <tr key={v.initiative_id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{v.initiatives?.title ?? '—'}</p>
                  {v.comment && (
                    <p className="text-xs text-slate-500 mt-0.5 italic">"{v.comment}"</p>
                  )}
                </td>
                <td className="text-center px-3 py-3 text-violet-400">{v.reach}%</td>
                <td className="text-center px-3 py-3 text-sky-400">{v.impact}</td>
                <td className="text-center px-3 py-3 text-emerald-400">{Math.round(v.confidence * 100)}%</td>
                <td className="text-center px-3 py-3 text-amber-400">{v.effort}</td>
                <td className={`text-center px-3 py-3 font-bold ${riceColor(score)}`}>
                  {score ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
