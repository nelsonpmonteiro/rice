'use client'

export default function ConfidenceInput({
  value,        // 0–100 (display %)
  onChange,
}: {
  value:    number
  onChange: (v: number) => void
}) {
  const display = value > 0 ? value : ''

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={display}
            placeholder="ex: 80"
            onChange={e => {
              const n = Number(e.target.value)
              if (!e.target.value) { onChange(0); return }
              onChange(Math.min(100, Math.max(0, n)))
            }}
            className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white
                       focus:outline-none focus:border-emerald-500 pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">%</span>
        </div>
        {value > 0 && (
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300
                ${value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${value}%` }}
            />
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600">
        {value >= 80
          ? 'Alta confiança — dados reais, experimentos ou pesquisa validada'
          : value >= 50
          ? 'Confiança média — alguns dados, feedbacks e lógica forte'
          : value > 0
          ? 'Baixa confiança — feeling, benchmarks ou sem evidência direta'
          : '% de confiança nas estimativas (0–100)'}
      </p>
    </div>
  )
}
