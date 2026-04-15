'use client'

export default function ParticipationIndicator({
  voted,
  total,
}: {
  voted: number
  total: number
}) {
  if (total === 0) return null
  const pct = Math.round((voted / total) * 100)

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <div className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors
              ${i < voted ? 'bg-brand-teal' : 'bg-slate-700'}`}
          />
        ))}
      </div>
      <span>{voted} de {total} membros já votaram ({pct}%)</span>
    </div>
  )
}
