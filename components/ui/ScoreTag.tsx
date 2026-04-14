export function scoreColor(value: number | null): string {
  if (value == null) return 'text-slate-500'
  if (value >= 50)   return 'text-emerald-400'
  if (value >= 20)   return 'text-yellow-400'
  return 'text-red-400'
}

export function scoreBg(value: number | null): string {
  if (value == null) return 'border-slate-800 bg-brand-mid'
  if (value >= 50)   return 'border-emerald-500/30 bg-emerald-900/10'
  if (value >= 20)   return 'border-yellow-500/30 bg-yellow-900/10'
  return 'border-red-500/30 bg-red-900/10'
}

export default function ScoreTag({ value, size = 'md' }: { value: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-4xl' : 'text-2xl'
  return (
    <span className={`font-black ${textSize} ${scoreColor(value)}`}>
      {value ?? '—'}
    </span>
  )
}
