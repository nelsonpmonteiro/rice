// ── Impact options (5 preset RICE multipliers) ───────────────
export const IMPACT_OPTIONS = [
  { label: 'Mínimo',  value: 0.25, desc: 'Quase imperceptível para o usuário' },
  { label: 'Baixo',   value: 0.5,  desc: 'Ganho marginal, impacto pequeno' },
  { label: 'Médio',   value: 1,    desc: 'Melhoria perceptível, mas não determinante para retenção' },
  { label: 'Alto',    value: 2,    desc: 'Melhoria significativa e perceptível para o usuário' },
  { label: 'Massivo', value: 3,    desc: 'Resolve dor crítica ou transforma o produto' },
]

// ── Confidence options kept for OverridePanel selects ─────────
export const CONFIDENCE_OPTIONS = [
  { label: 'Baixa (50%)',  value: 0.5, desc: 'Feeling, benchmarks ou sem evidência direta' },
  { label: 'Média (80%)', value: 0.8, desc: 'Alguns dados, feedbacks e lógica forte' },
  { label: 'Alta (100%)',  value: 1.0, desc: 'Dados reais, experimentos ou pesquisa validada' },
]

// ── Field validation rules ────────────────────────────────────
export const FIELD_RULES = {
  reach:      { min: 0,    max: 100,  unit: '%',         label: 'Alcance',   hint: '% da base de clientes impactada' },
  impact:     { min: 0.25, max: 3,                       label: 'Impacto',   hint: '' },
  confidence: { min: 0,    max: 100,  unit: '%',         label: 'Confiança', hint: '% de confiança nas estimativas' },
  effort:     { min: 0.25, max: 999,  unit: 'pessoa-mês', label: 'Esforço',  hint: 'Total pessoas-mês (dev + design + QA + PM)' },
}

// ── RICE formula ──────────────────────────────────────────────
// reach: 0–100 (percentage stored as-is)
// impact: 0.25–3 (RICE multiplier)
// confidence: 0–1 (decimal, e.g. 0.8 = 80%)
// effort: person-months > 0
export function calcRice(
  reach:      number,
  impact:     number,
  confidence: number,
  effort:     number,
): number | null {
  if (!effort || effort <= 0) return null
  if (!reach || reach <= 0) return null
  return Math.round((reach * impact * confidence) / effort * 10) / 10
}

// ── Color helpers ─────────────────────────────────────────────
export function riceColor(score: number | null): string {
  if (score === null) return 'text-slate-500'
  if (score >= 50)   return 'text-emerald-400'
  if (score >= 20)   return 'text-yellow-400'
  return 'text-red-400'
}

export function riceBg(score: number | null): string {
  if (score === null) return 'border-slate-800 bg-brand-dark'
  if (score >= 50)   return 'border-emerald-500/30 bg-emerald-900/10'
  if (score >= 20)   return 'border-yellow-500/30 bg-yellow-900/10'
  return 'border-red-500/30 bg-red-900/10'
}
