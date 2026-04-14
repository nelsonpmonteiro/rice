'use client'

import { useState } from 'react'
import { IMPACT_OPTIONS, CONFIDENCE_OPTIONS, calcRice } from '@/lib/rice'
import type { Initiative, Vote } from '@/lib/supabase/client'

export default function VoteForm({
  initiative,
  existingVote,
  votingOpen,
  onVoted,
}: {
  initiative: Initiative
  existingVote: Vote | null
  votingOpen: boolean
  onVoted: () => void
}) {
  const [reach, setReach]       = useState(existingVote?.reach ?? 10)
  const [impact, setImpact]     = useState(existingVote?.impact ?? 1)
  const [confidence, setConf]   = useState(existingVote?.confidence ?? 0.8)
  const [effort, setEffort]     = useState(existingVote?.effort ?? 1)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const preview = calcRice(reach, impact, confidence, effort)

  async function submit() {
    if (!votingOpen) return
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

  return (
    <div className="space-y-4 pt-3 border-t border-slate-800">
      {/* Reach */}
      <div>
        <label className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
          Reach — quantos usuários/mês?
        </label>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="number" min={0} value={reach}
            onChange={e => setReach(Number(e.target.value))}
            disabled={!votingOpen}
            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
          />
          <span className="text-slate-500 text-xs">ex: 60 usuários/mês</span>
        </div>
      </div>

      {/* Impact */}
      <div>
        <label className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Impact</label>
        <div className="grid grid-cols-5 gap-1.5 mt-1">
          {IMPACT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setImpact(o.value)}
              disabled={!votingOpen}
              title={`${o.label}: ${o.desc}`}
              className={`py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40
                ${impact === o.value
                  ? 'bg-sky-600 border-sky-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-sky-600'}`}
            >
              {o.value}
            </button>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-1">
          {IMPACT_OPTIONS.find(o => o.value === impact)?.label}: {IMPACT_OPTIONS.find(o => o.value === impact)?.desc}
        </p>
      </div>

      {/* Confidence */}
      <div>
        <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Confidence</label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {CONFIDENCE_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setConf(o.value)}
              disabled={!votingOpen}
              title={o.desc}
              className={`py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40
                ${confidence === o.value
                  ? 'bg-emerald-700 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-600'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Effort */}
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          Effort — pessoas-mês
        </label>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="number" min={0.25} step={0.25} value={effort}
            onChange={e => setEffort(Number(e.target.value))}
            disabled={!votingOpen}
            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
          />
          <span className="text-slate-500 text-xs">ex: 2.5 = 1 dev × 2,5 meses</span>
        </div>
      </div>

      {/* Preview + submit */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-slate-400">
          Preview: <span className="font-bold text-white">{preview}</span>
        </div>
        {votingOpen ? (
          <button
            onClick={submit}
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all
              ${saved
                ? 'bg-emerald-700 text-white'
                : 'bg-brand-teal text-brand-dark hover:bg-cyan-300'}`}
          >
            {saving ? 'Salvando…' : saved ? '✓ Salvo' : existingVote ? 'Atualizar voto' : 'Votar'}
          </button>
        ) : (
          <span className="text-xs text-slate-600 italic">votação encerrada</span>
        )}
      </div>
    </div>
  )
}
