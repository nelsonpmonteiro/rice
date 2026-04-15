'use client'

import { useState } from 'react'
import { IMPACT_OPTIONS, CONFIDENCE_OPTIONS, calcRice } from '@/lib/rice'
import type { Initiative, Vote } from '@/lib/supabase/client'

export default function VoteForm({
  initiative,
  existingVote,
  onVoted,
}: {
  initiative: Initiative
  existingVote: Vote | null
  onVoted: () => void
}) {
  const [reach,      setReach]  = useState(existingVote?.reach      ?? 0)
  const [impact,     setImpact] = useState(existingVote?.impact     ?? 1)
  const [confidence, setConf]   = useState(existingVote?.confidence ?? 0.8)
  const [effort,     setEffort] = useState(existingVote?.effort     ?? 1)
  const [saving,     setSaving] = useState(false)
  const [saved,      setSaved]  = useState(false)

  const preview = calcRice(reach, impact, confidence, effort)
  const previewValid = reach > 0 && effort > 0

  async function submit() {
    setSaving(true)
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiative_id: initiative.id, reach, impact, confidence, effort }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onVoted()
    }
  }

  const impactSelected    = IMPACT_OPTIONS.find(o => o.value === impact)
  const confSelected      = CONFIDENCE_OPTIONS.find(o => o.value === confidence)

  return (
    <div className="space-y-4 pt-3 border-t border-slate-800">

      {/* Banner: já votou */}
      {existingVote && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-900/20 border border-emerald-500/20 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-0.5" />
          Você já votou nesta iniciativa. Atualize abaixo se quiser.
        </div>
      )}

      {/* Alcance */}
      <div>
        <label className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
          Alcance
        </label>
        <div className="flex items-center gap-3 mt-1.5">
          <input
            type="number"
            min={0}
            value={reach || ''}
            placeholder="ex: 60"
            onChange={e => setReach(Number(e.target.value))}
            className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
          />
          <span className="text-slate-500 text-xs">usuários/mês</span>
        </div>
        <p className="text-slate-600 text-xs mt-1">Usuários ou eventos impactados por mês</p>
      </div>

      {/* Impacto */}
      <div>
        <label className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Impacto</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-1.5">
          {IMPACT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setImpact(o.value)}
              className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all active:scale-95
                ${impact === o.value
                  ? 'bg-sky-600 border-sky-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-sky-600 hover:text-slate-200'}`}
            >
              {o.label} · {o.value}
            </button>
          ))}
        </div>
        {impactSelected && (
          <p className="text-slate-500 text-xs mt-1.5">
            <span className="text-sky-400 font-medium">{impactSelected.label}:</span>{' '}
            {impactSelected.desc}
          </p>
        )}
      </div>

      {/* Confiança */}
      <div>
        <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Confiança</label>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          {CONFIDENCE_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setConf(o.value)}
              className={`py-2 rounded-lg text-xs font-semibold border transition-all active:scale-95
                ${confidence === o.value
                  ? 'bg-emerald-700 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-600 hover:text-slate-200'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {confSelected && (
          <p className="text-slate-500 text-xs mt-1.5">
            <span className="text-emerald-400 font-medium">{confSelected.label.split(' ')[0]}:</span>{' '}
            {confSelected.desc}
          </p>
        )}
      </div>

      {/* Esforço */}
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Esforço</label>
        <div className="flex items-center gap-3 mt-1.5">
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={effort || ''}
            placeholder="ex: 2.5"
            onChange={e => setEffort(Number(e.target.value))}
            className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
          />
          <span className="text-slate-500 text-xs">pessoas-mês</span>
        </div>
        <p className="text-slate-600 text-xs mt-1">Total de pessoas-mês de todos os perfis (dev, design, QA)</p>
      </div>

      {/* Score estimado + botão */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
        <div className="text-sm text-slate-400">
          Score estimado:{' '}
          {previewValid && preview != null
            ? <span className={`font-black text-lg ${preview >= 50 ? 'text-emerald-400' : preview >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                {preview}
              </span>
            : <span className="font-black text-lg text-slate-500">—</span>
          }
        </div>
        <button
          onClick={submit}
          disabled={saving || !reach || !effort}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50
            ${saved
              ? 'bg-emerald-700 text-white'
              : 'bg-brand-teal text-brand-dark hover:bg-cyan-300'}`}
        >
          {saving ? 'Salvando…' : saved ? '✓ Voto registrado' : existingVote ? 'Atualizar voto' : 'Votar'}
        </button>
      </div>
    </div>
  )
}
