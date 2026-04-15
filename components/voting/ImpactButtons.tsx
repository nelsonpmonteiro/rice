'use client'

import { IMPACT_OPTIONS } from '@/lib/rice'

export default function ImpactButtons({
  value,
  onChange,
}: {
  value:    number
  onChange: (v: number) => void
}) {
  const selected = IMPACT_OPTIONS.find(o => o.value === value)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1.5">
        {IMPACT_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`py-2.5 px-1 rounded-lg text-xs font-semibold border transition-all active:scale-95
              ${value === o.value
                ? 'bg-sky-600 border-sky-400 text-white shadow-sm shadow-sky-900/40'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-sky-700 hover:text-slate-200'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-slate-500 min-h-[1rem]">
          <span className="text-sky-400 font-medium">{selected.label}:</span>{' '}
          {selected.desc}
        </p>
      )}
    </div>
  )
}
