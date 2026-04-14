'use client'

import { useState } from 'react'
import { scoreColor, scoreBg } from '@/components/ui/ScoreTag'
import VoteForm from '@/components/workspace/VoteForm'
import OverridePanel from '@/components/workspace/OverridePanel'
import type { InitiativeScore, Vote } from '@/lib/supabase/client'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

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
  const [expanded,     setExpanded]  = useState(false)
  const [showOverride, setOverride]  = useState(false)

  const hasData  = initiative.vote_count > 0 || initiative.has_override
  const inSession = !!initiative.session_id

  return (
    <div className={`rounded-xl border overflow-hidden ${scoreBg(initiative.rice_score)}`}>

      {/* ── Cabeçalho ───────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-600 text-sm font-mono w-6 shrink-0">#{rank}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-white text-base">{initiative.title}</p>
              {initiative.has_override && (
                <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                  ⚡ ajuste
                </span>
              )}
              {myVote && (
                <span className="text-xs text-emerald-400">✓ votei</span>
              )}
            </div>
            {initiative.description && (
              <p className="text-slate-400 text-xs mt-0.5 truncate max-w-sm sm:max-w-lg">
                {initiative.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500">Score RICE</div>
            {initiative.rice_score != null
              ? <span className={`font-black text-2xl ${scoreColor(initiative.rice_score)}`}>{initiative.rice_score}</span>
              : <span
                  className="font-black text-2xl text-slate-500 cursor-help"
                  title="Adicione esta iniciativa a uma sessão para coletar votos"
                >—</span>
            }
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Votos</div>
            <div className="text-sm font-medium text-slate-300">{initiative.vote_count}</div>
          </div>
          {/* Score mobile */}
          <div className="sm:hidden text-right">
            {initiative.rice_score != null
              ? <span className={`font-black text-xl ${scoreColor(initiative.rice_score)}`}>{initiative.rice_score}</span>
              : <span className="font-black text-xl text-slate-500">—</span>
            }
          </div>
          <Chevron open={expanded} />
        </div>
      </button>

      {/* ── Barra de fatores (colapsado, com dados) ─────────────── */}
      {hasData && !expanded && (
        <div className="grid grid-cols-4 gap-px border-t border-slate-800/50 bg-slate-800/30">
          {[
            { label: 'Alcance',   val: initiative.reach,      color: 'text-violet-400' },
            { label: 'Impacto',   val: initiative.impact,     color: 'text-sky-400'    },
            { label: 'Confiança', val: initiative.confidence, color: 'text-emerald-400' },
            { label: 'Esforço',   val: initiative.effort,     color: 'text-amber-400'  },
          ].map(f => (
            <div key={f.label} className="bg-brand-dark/50 py-1.5 text-center">
              <div className="text-[10px] text-slate-600">{f.label}</div>
              <div className={`text-xs font-bold ${f.color}`}>{f.val ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Conteúdo expandido ──────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-800/50">

          {/* Nota de override */}
          {initiative.has_override && (
            <div className="mx-4 mt-3 text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-1.5">
              ⚡ Ajuste de score aplicado pelo admin
              {initiative.override_note && ` — ${initiative.override_note}`}
            </div>
          )}

          <div className="px-4 pb-4">
            {votingOpen ? (
              /* VOTAÇÃO ABERTA → formulário */
              <VoteForm
                initiative={initiative}
                existingVote={myVote}
                onVoted={onRefresh}
              />
            ) : (
              /* VOTAÇÃO FECHADA ou sem sessão → dados ou estado vazio */
              <div className="space-y-3 pt-3 border-t border-slate-800">

                {/* Badge de estado */}
                {inSession && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                    <span className="text-xs text-slate-500">Votação encerrada</span>
                  </div>
                )}

                {hasData ? (
                  /* Médias dos fatores */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Alcance',   val: initiative.reach,      color: 'text-violet-400' },
                      { label: 'Impacto',   val: initiative.impact,     color: 'text-sky-400'    },
                      { label: 'Confiança', val: initiative.confidence, color: 'text-emerald-400' },
                      { label: 'Esforço',   val: initiative.effort,     color: 'text-amber-400'  },
                    ].map(f => (
                      <div key={f.label} className="bg-slate-900/60 rounded-lg p-2.5 text-center border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">{f.label}</div>
                        <div className={`text-sm font-bold ${f.color}`}>{f.val ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Estado vazio */
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">Sem votos ainda.</p>
                    <p className="text-xs text-slate-600">
                      {inSession
                        ? 'Abra a votação nesta sessão para coletar scores do time.'
                        : 'Adicione esta iniciativa a uma sessão para coletar votos.'}
                    </p>
                  </div>
                )}

                {initiative.vote_count > 0 && (
                  <p className="text-xs text-slate-600">
                    {initiative.vote_count} {initiative.vote_count === 1 ? 'voto registrado' : 'votos registrados'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Botão de ajuste (admin) */}
          {isAdmin && (
            <div className="px-4 pb-3 border-t border-slate-800/50 pt-3">
              <button
                onClick={() => setOverride(o => !o)}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                {showOverride ? '↑ Fechar ajuste' : '⚡ Ajuste de score'}
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
