'use client'

import { useState } from 'react'
import ScoreTag, { scoreBg } from '@/components/ui/ScoreTag'
import VoteForm from '@/components/workspace/VoteForm'
import OverridePanel from '@/components/workspace/OverridePanel'
import type { InitiativeScore, Vote } from '@/lib/supabase/client'

export default function InitiativeCard({
  initiative,
  rank,
  isAdmin,
  votingOpen,
  myVote,
  onRefresh,
}: {
  initiative: InitiativeScore
  rank: number
  isAdmin: boolean
  votingOpen: boolean
  myVote: Vote | null
  onRefresh: () => void
}) {
  const [expanded, setExpanded]     = useState(false)
  const [showOverride, setOverride] = useState(false)

  return (
    <div className={`rounded-xl border overflow-hidden ${scoreBg(initiative.rice_score)}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-600 text-sm font-mono w-6 shrink-0">#{rank}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-white">{initiative.title}</p>
              {initiative.has_override && (
                <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                  ⚡ ajuste
                </span>
              )}
            </div>
            {initiative.description && (
              <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{initiative.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <div className="text-right">
            <div className="text-xs text-slate-500">Score</div>
            <ScoreTag value={initiative.rice_score} />
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Votos</div>
            <div className="text-sm font-medium text-slate-300">{initiative.vote_count}</div>
          </div>
          {myVote && <span className="text-xs text-emerald-400">✓ votei</span>}
          <span className="text-slate-600">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      {/* Factors */}
      {(initiative.vote_count > 0 || initiative.has_override) && !expanded && (
        <div className="grid grid-cols-4 gap-px border-t border-slate-800/50 bg-slate-800/30">
          {[
            { label: 'R', val: initiative.reach,      color: 'text-violet-400' },
            { label: 'I', val: initiative.impact,     color: 'text-sky-400' },
            { label: 'C', val: initiative.confidence, color: 'text-emerald-400' },
            { label: 'E', val: initiative.effort,     color: 'text-amber-400' },
          ].map(f => (
            <div key={f.label} className="bg-brand-dark/50 py-1.5 text-center">
              <div className="text-xs text-slate-600">{f.label}</div>
              <div className={`text-xs font-bold ${f.color}`}>{f.val ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-800/50">
          {initiative.has_override && (
            <div className="mx-4 mt-3 text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-1.5">
              ⚡ Admin aplicou ajuste manual
              {initiative.override_note && ` — ${initiative.override_note}`}
            </div>
          )}
          <div className="px-4 pb-4">
            <VoteForm
              initiative={initiative}
              existingVote={myVote}
              votingOpen={votingOpen}
              onVoted={onRefresh}
            />
          </div>
          {isAdmin && (
            <div className="px-4 pb-2">
              <button
                onClick={() => setOverride(o => !o)}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                {showOverride ? '↑ Fechar override' : '⚡ Ajuste manual (override)'}
              </button>
            </div>
          )}
          {isAdmin && showOverride && (
            <OverridePanel
              initiative={initiative}
              onDone={() => { setOverride(false); onRefresh() }}
            />
          )}
        </div>
      )}
    </div>
  )
}
