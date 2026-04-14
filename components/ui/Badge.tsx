type Variant = 'default' | 'success' | 'warning' | 'danger' | 'teal' | 'pulse'

const variants: Record<Variant, string> = {
  default: 'bg-slate-800 text-slate-400 border-slate-700',
  success: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-900/30 text-amber-400 border-amber-500/20',
  danger:  'bg-red-900/30 text-red-400 border-red-500/20',
  teal:    'bg-brand-teal/20 text-brand-teal border-brand-teal/30',
  pulse:   'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
}

export default function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: Variant
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${variants[variant]}`}>
      {variant === 'pulse' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {children}
    </span>
  )
}
