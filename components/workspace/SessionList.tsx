'use client'

import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import type { Session } from '@/lib/supabase/client'

export default function SessionList({
  sessions,
  isAdmin,
  onToggleVoting,
  onToggleStatus,
  onCreateSession,
}: {
  sessions: Session[]
  isAdmin: boolean
  onToggleVoting: (session: Session) => void
  onToggleStatus: (session: Session) => void
  onCreateSession: () => void
}) {
  const open   = sessions.filter(s => s.status === 'open')
  const closed = sessions.filter(s => s.status === 'closed')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sessões</h2>
        {isAdmin && (
          <button
            onClick={onCreateSession}
            className="px-3 py-1.5 bg-brand-teal text-brand-dark text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors"
          >
            + Nova sessão
          </button>
        )}
      </div>

      {open.length === 0 && (
        <div className="rounded-xl border border-slate-800 p-5 text-center text-slate-500 text-sm">
          Nenhuma sessão aberta.
          {isAdmin && (
            <button onClick={onCreateSession} className="ml-1 text-brand-teal hover:underline">
              Criar agora →
            </button>
          )}
        </div>
      )}

      {open.map(s => (
        <div key={s.id} className="rounded-xl border border-slate-800 bg-brand-mid p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-white">{s.name}</p>
                {s.voting_open
                  ? <Badge variant="pulse">votação ativa</Badge>
                  : <Badge variant="default">votação fechada</Badge>}
              </div>
              {s.description && <p className="text-slate-400 text-xs mt-0.5">{s.description}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {s.voting_open && (
                <Link
                  href={`/session/${s.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-teal text-brand-dark hover:bg-cyan-300 transition-colors"
                >
                  Votar →
                </Link>
              )}
              {isAdmin && (
                <>
                  <button
                    onClick={() => onToggleVoting(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                      ${s.voting_open
                        ? 'border-red-500/40 text-red-400 hover:bg-red-900/20'
                        : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/20'}`}
                  >
                    {s.voting_open ? '⏸ Encerrar votação' : '▶ Abrir votação'}
                  </button>
                  <button
                    onClick={() => onToggleStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-500 hover:text-white transition-colors"
                  >
                    Arquivar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {isAdmin && closed.length > 0 && (
        <details className="group">
          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 transition-colors list-none">
            {closed.length} sessão(ões) arquivada(s) ▸
          </summary>
          <div className="mt-2 space-y-2">
            {closed.map(s => (
              <div key={s.id} className="rounded-xl border border-slate-800 bg-brand-mid/50 p-3 flex items-center justify-between">
                <p className="text-slate-500 text-sm">{s.name}</p>
                <button
                  onClick={() => onToggleStatus(s)}
                  className="text-xs text-slate-600 hover:text-emerald-400 transition-colors"
                >
                  Reabrir
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
