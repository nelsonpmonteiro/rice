'use client'

import { calcRice, riceColor } from '@/lib/rice'

export default function ScorePreview({
  reach,
  impact,
  confidence,   // 0–1 decimal
  effort,
}: {
  reach:      number
  impact:     number
  confidence: number
  effort:     number
}) {
  const score = calcRice(reach, impact, confidence, effort)

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Score estimado:</span>
      {score !== null
        ? <span className={`font-black text-2xl ${riceColor(score)}`}>{score}</span>
        : <span className="font-black text-2xl text-slate-600">—</span>
      }
    </div>
  )
}
