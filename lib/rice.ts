export const IMPACT_OPTIONS = [
  { label: 'Massivo', value: 3,    desc: 'Resolve dor crítica / transforma o produto' },
  { label: 'Alto',    value: 2,    desc: 'Melhoria significativa e perceptível' },
  { label: 'Médio',   value: 1,    desc: 'Melhoria perceptível, mas não determinante' },
  { label: 'Baixo',   value: 0.5,  desc: 'Ganho marginal' },
  { label: 'Mínimo',  value: 0.25, desc: 'Quase imperceptível' },
]

export const CONFIDENCE_OPTIONS = [
  { label: 'Alta (100%)',  value: 1.0, desc: 'Dados reais, experimentos, pesquisa validada' },
  { label: 'Média (80%)', value: 0.8, desc: 'Alguns dados, feedbacks, lógica forte' },
  { label: 'Baixa (50%)', value: 0.5, desc: 'Feeling, benchmarks, sem evidência direta' },
]

export function calcRice(
  reach: number,
  impact: number,
  confidence: number,
  effort: number
): number {
  if (!effort || effort <= 0) return 0
  return Math.round((reach * impact * confidence) / effort * 10) / 10
}

export function riceColor(score: number | null): string {
  if (score === null) return 'text-slate-400'
  if (score >= 50) return 'text-emerald-400'
  if (score >= 20) return 'text-yellow-400'
  return 'text-red-400'
}

export function riceBg(score: number | null): string {
  if (score === null) return 'bg-slate-800'
  if (score >= 50) return 'bg-emerald-900/40 border-emerald-500/30'
  if (score >= 20) return 'bg-yellow-900/40 border-yellow-500/30'
  return 'bg-red-900/40 border-red-500/30'
}
