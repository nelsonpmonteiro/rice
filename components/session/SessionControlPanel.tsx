'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CloseSessionModal from '@/components/modals/CloseSessionModal'

type Session = {
  id:           string
  name:         string
  workspace_id: string
  status:       string
  voting_open:  boolean
}

export default function SessionControlPanel({
  session,
  voterCount,
  memberCount,
  notVoted,
  onRefresh,
}: {
  session:    Session
  voterCount:  number
  memberCount: number
  notVoted:    { name: string; email: string }[]
  onRefresh:   () => void
}) {
  const router = useRouter()
  const [acting,         setActing]         = useState(false)
  const [showNonVoters,  setShowNonVoters]  = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [archiving,      setArchiving]      = useState(false)

  const { id: sessionId, workspace_id, status, voting_open, name } = session
  const pct = memberCount > 0 ? Math.round((voterCount / memberCount) * 100) : 0

  async function patch(body: Record<string, unknown>) {
    setActing(true)
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    setActing(false)
    if (res.ok) onRefresh()
    return res
  }

  async function handleArchive() {
    if (!confirm(`Arquivar "${name}"? A sessão será movida para o histórico.`)) return
    setArchiving(true)
    await fetch(`/api/sessions/${sessionId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'archived' }),
    })
    setArchiving(false)
    router.push(`/workspace/${workspace_id}`)
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-brand-mid p-5 space-y-5">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Painel de controle</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
            ${status === 'draft'    ? 'bg-slate-700 text-slate-300' :
              status === 'open' && voting_open  ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' :
              status === 'open' && !voting_open ? 'bg-amber-900/30  text-amber-400  border border-amber-500/20'  :
              status === 'closed'   ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' :
              'bg-slate-800 text-slate-400'}`}>
            {status === 'draft'    ? 'Rascunho' :
             status === 'open' && voting_open  ? 'Votação ativa' :
             status === 'open' && !voting_open ? 'Publicada · pausada' :
             status === 'closed'   ? 'Encerrada' : 'Arquivada'}
          </span>
        </div>

        {/* Participation bar (only when open or closed) */}
        {(status === 'open' || status === 'closed') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Participação</span>
              <button
                onClick={() => setShowNonVoters(v => !v)}
                className="text-slate-400 hover:text-white transition-colors font-semibold tabular-nums"
              >
                {voterCount}/{memberCount} membros
              </button>
            </div>
            <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-right">{pct}% participação</p>

            {/* Non-voters list */}
            {showNonVoters && notVoted.length > 0 && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-1.5 mt-1">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                  Ainda não votaram ({notVoted.length})
                </p>
                {notVoted.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-medium">{m.name}</span>
                    <span className="text-slate-500 truncate">{m.email}</span>
                  </div>
                ))}
              </div>
            )}
            {showNonVoters && notVoted.length === 0 && (
              <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/20 p-3 text-xs text-emerald-400 text-center">
                Todos os membros votaram! ✓
              </div>
            )}
          </div>
        )}

        {/* ── Actions by state ── */}

        {/* DRAFT: only publish */}
        {status === 'draft' && (
          <div className="space-y-3 pt-1 border-t border-slate-800">
            <Link
              href={`/session/${sessionId}/compose`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              ✏ Editar iniciativas
            </Link>
            <button
              onClick={() => patch({ status: 'open' })}
              disabled={acting}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-teal text-brand-dark text-sm font-semibold hover:bg-cyan-300 transition-colors disabled:opacity-50"
            >
              {acting ? 'Publicando…' : 'Publicar sessão →'}
            </button>
          </div>
        )}

        {/* OPEN + voting_open=false */}
        {status === 'open' && !voting_open && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <button
              onClick={() => patch({ voting_open: true })}
              disabled={acting}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {acting ? '…' : '▶ Abrir votação'}
            </button>
            <Link
              href={`/session/${sessionId}/compose`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              ✏ Editar iniciativas
            </Link>
          </div>
        )}

        {/* OPEN + voting_open=true */}
        {status === 'open' && voting_open && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <button
              onClick={() => patch({ voting_open: false })}
              disabled={acting}
              className="w-full px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {acting ? '…' : '⏸ Pausar votação'}
            </button>
            <div className="border-t border-slate-800 pt-2">
              <button
                onClick={() => setShowCloseModal(true)}
                disabled={acting}
                className="w-full px-4 py-2.5 rounded-xl bg-red-900/30 border border-red-500/30 hover:bg-red-900/50 text-red-400 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                ■ Encerrar sessão
              </button>
            </div>
          </div>
        )}

        {/* CLOSED */}
        {status === 'closed' && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <Link
              href={`/session/${sessionId}/results/admin`}
              className="flex items-center justify-center gap-1 w-full px-4 py-2.5 rounded-xl bg-purple-900/30 border border-purple-500/20 text-purple-300 text-sm font-semibold hover:bg-purple-900/50 transition-colors"
            >
              Ver resultados →
            </Link>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {archiving ? '…' : '📦 Arquivar sessão'}
            </button>
          </div>
        )}

        {/* ARCHIVED */}
        {status === 'archived' && (
          <div className="pt-1 border-t border-slate-800">
            <Link
              href={`/session/${sessionId}/results/admin`}
              className="flex items-center justify-center gap-1 w-full px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              Ver resultados →
            </Link>
          </div>
        )}
      </div>

      {showCloseModal && (
        <CloseSessionModal
          sessionId={sessionId}
          sessionName={name}
          onClose={() => setShowCloseModal(false)}
          onConfirmed={() => {
            setShowCloseModal(false)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
