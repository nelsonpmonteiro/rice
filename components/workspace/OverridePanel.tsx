'use client'

import { useState } from 'react'
import { IMPACT_OPTIONS, CONFIDENCE_OPTIONS } from '@/lib/rice'
import type { InitiativeScore } from '@/lib/supabase/client'

export default function OverridePanel({
  initiative,
  onDone,
}: {
  initiative: InitiativeScore
  onDone: () => void
}) {
  const [ovReach,  setOvReach]  = useState(String(initiative.reach  ?? ''))
  const [ovImpact, setOvImpact] = useState(String(initiative.impact ?? ''))
  const [ovConf,   setOvConf]   = useState(String(initiative.confidence ?? ''))
  const [ovEffort, setOvEffort] = useState(String(initiative.effort ?? ''))
  const [ovNote,   setOvNote]   = useState(initiative.override_note ?? '')
  const [saving,   setSaving]   = useState(false)

  async function apply() {
    setSaving(true)
    await fetch('/api/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initiative_id: initiative.id,
        reach:      ovReach  ? Number(ovReach)  : null,
        impact:     ovImpact ? Number(ovImpact) : null,
        confidence: ovConf   ? Number(ovConf)   : null,
        effort:     ovEffort ? Number(ovEffort) : null,
        note:       ovNote   || null,
      }),
    })
    setSaving(false)
    onDone()
  }

  async function remove() {
    setSaving(true)
    await fetch('/api/overrides', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiative_id: initiative.id }),
    })
    setSaving(false)
    onDone()
  }

  return (
    <div className="p-4 border-t border-slate-800 bg-amber-950/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">⚡ Ajuste de score</p>
        {initiative.has_override && (
          <button
            onClick={remove}
            disabled={saving}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Restaurar média
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">Campo vazio = mantém a média dos votos para esse fator.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-violet-400 mb-1 block">Alcance</label>
          <input type="number" min={0} value={ovReach} onChange={e => setOvReach(e.target.value)}
            placeholder="ex: 60"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="text-xs text-sky-400 mb-1 block">Impacto</label>
          <select value={ovImpact} onChange={e => setOvImpact(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500">
            <option value="">—</option>
            {IMPACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-emerald-400 mb-1 block">Confiança</label>
          <select value={ovConf} onChange={e => setOvConf(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500">
            <option value="">—</option>
            {CONFIDENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-amber-400 mb-1 block">Esforço</label>
          <input type="number" min={0.25} step={0.25} value={ovEffort} onChange={e => setOvEffort(e.target.value)}
            placeholder="ex: 2.5"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
        </div>
      </div>

      <input
        placeholder="Nota explicativa (visível para todos)"
        value={ovNote}
        onChange={e => setOvNote(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
      />

      <div className="flex gap-2">
        <button
          onClick={apply}
          disabled={saving}
          className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-500 transition-colors disabled:opacity-50"
        >
          {saving ? 'Aplicando…' : 'Aplicar override'}
        </button>
        <button onClick={onDone} className="px-4 py-2 text-sm text-slate-500 hover:text-white transition-colors">
          Fechar
        </button>
      </div>
    </div>
  )
}
