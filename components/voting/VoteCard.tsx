'use client'

import { useState, useEffect, useRef } from 'react'
import ImpactButtons    from '@/components/voting/ImpactButtons'
import ConfidenceInput  from '@/components/voting/ConfidenceInput'
import ScorePreview     from '@/components/voting/ScorePreview'
import type { InitiativeScore } from '@/lib/supabase/client'

export type VoteFields = {
  reach:      number
  impact:     number
  confidence: number   // 0–100 display; caller converts to 0–1 before submitting
  effort:     number
  comment:    string
}

export default function VoteCard({
  initiative,
  sessionId,
  initial,
  onDraftChange,
  onConfirm,
  onPrev,
  isFirst,
  isLast,
  saving,
}: {
  initiative:    InitiativeScore
  sessionId:     string
  initial?:      Partial<VoteFields>
  onDraftChange: (fields: VoteFields) => void
  onConfirm:     (fields: VoteFields) => Promise<void>
  onPrev:        () => void
  isFirst:       boolean
  isLast:        boolean
  saving:        boolean
}) {
  const [reach,      setReach]      = useState(initial?.reach      ?? 0)
  const [impact,     setImpact]     = useState(initial?.impact     ?? 1)
  const [confidence, setConfidence] = useState(initial?.confidence ?? 80)
  const [effort,     setEffort]     = useState(initial?.effort     ?? 1)
  const [comment,    setComment]    = useState(initial?.comment    ?? '')

  // Sync draft with debounce
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fields = { reach, impact, confidence, effort, comment }

  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => onDraftChange(fields), 500)
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reach, impact, confidence, effort, comment])

  const canSubmit =
    reach > 0 && reach <= 100 &&
    impact > 0 &&
    confidence > 0 && confidence <= 100 &&
    effort > 0 &&
    !saving

  async function handleConfirm() {
    if (!canSubmit) return
    await onConfirm(fields)
  }

  return (
    <div className="space-y-5">
      {/* Initiative title */}
      <div className="rounded-xl border border-slate-800 bg-brand-mid/60 px-4 py-3">
        <p className="text-base font-semibold text-white">{initiative.title}</p>
        {initiative.description && (
          <p className="text-sm text-slate-400 mt-1">{initiative.description}</p>
        )}
      </div>

      {/* Alcance */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Alcance</label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={reach || ''}
              placeholder="ex: 40"
              onChange={e => setReach(Math.min(100, Math.max(0, Number(e.target.value))))}
              className={`w-28 bg-slate-900 border rounded-lg px-3 py-2 text-sm text-white
                         focus:outline-none focus:border-violet-500 pr-8
                         ${reach > 100 ? 'border-red-500' : 'border-slate-700'}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">%</span>
          </div>
          <span className="text-slate-500 text-xs">da base de clientes</span>
        </div>
        <p className="text-xs text-slate-600">Usuários ou eventos impactados por mês</p>
      </div>

      {/* Impacto */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Impacto</label>
        <ImpactButtons value={impact} onChange={setImpact} />
      </div>

      {/* Confiança */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Confiança</label>
        <ConfidenceInput value={confidence} onChange={setConfidence} />
      </div>

      {/* Esforço */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Esforço</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={effort || ''}
            placeholder="ex: 2"
            onChange={e => setEffort(Math.max(0.25, Number(e.target.value)))}
            className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white
                       focus:outline-none focus:border-amber-500"
          />
          <span className="text-slate-500 text-xs">pessoas-mês</span>
        </div>
        <p className="text-xs text-slate-600">Total de pessoas-mês (dev + design + QA + PM)</p>
      </div>

      {/* Comentário */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Comentário ou premissa <span className="text-slate-600 normal-case font-normal">(opcional)</span>
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value.slice(0, 200))}
          rows={2}
          maxLength={200}
          placeholder="Ex.: considerei só clientes que usam o módulo fiscal"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white
                     focus:outline-none focus:border-slate-500 placeholder:text-slate-600 resize-none"
        />
        <p className="text-right text-xs text-slate-600">{comment.length}/200</p>
      </div>

      {/* Score preview */}
      <div className="flex items-center justify-between py-3 border-t border-slate-800">
        <ScorePreview
          reach={reach}
          impact={impact}
          confidence={confidence / 100}
          effort={effort}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-30"
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95
            ${canSubmit
              ? 'bg-brand-teal text-brand-dark hover:bg-cyan-300'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
        >
          {saving ? 'Salvando…' : isLast ? 'Confirmar e finalizar →' : 'Confirmar →'}
        </button>
      </div>
    </div>
  )
}
