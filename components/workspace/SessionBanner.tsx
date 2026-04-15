'use client'

import Link from 'next/link'
import type { Session } from '@/lib/supabase/client'

// 5 banner states per the PRD spec
export default function SessionBanner({
  session,
  hasVoted,
  initiativeCount,
}: {
  session:         Session
  hasVoted:        boolean
  initiativeCount: number
}) {
  if (!session.voting_open && session.status === 'open') {
    // Paused
    return (
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3
        ${hasVoted ? 'border-slate-700 bg-brand-mid/40' : 'border-amber-500/20 bg-amber-950/10'}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${hasVoted ? 'bg-slate-500' : 'bg-amber-400'}`} />
        <p className="text-sm text-slate-400">
          {hasVoted
            ? 'Votação pausada pelo administrador.'
            : 'Votação temporariamente pausada. Aguarde a reabertura.'}
        </p>
      </div>
    )
  }

  if (!session.voting_open && session.status === 'closed') {
    return (
      <div className="rounded-xl border border-slate-700 bg-brand-mid/40 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
          <p className="text-sm text-slate-400">Sessão encerrada. Resultados disponíveis.</p>
        </div>
        <Link
          href={`/session/${session.id}/results`}
          className="text-xs font-semibold text-brand-teal hover:underline shrink-0"
        >
          Ver resultados →
        </Link>
      </div>
    )
  }

  if (session.voting_open && hasVoted) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-4 py-3 flex items-center gap-3">
        <span className="text-emerald-400 shrink-0">✓</span>
        <p className="text-sm text-slate-400">Você já votou nesta sessão. Aguarde o encerramento.</p>
      </div>
    )
  }

  if (session.voting_open && !hasVoted) {
    return (
      <div className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse shrink-0" />
          <p className="text-sm text-white">
            Votação aberta —{' '}
            <span className="text-slate-400">{initiativeCount} {initiativeCount === 1 ? 'iniciativa aguarda' : 'iniciativas aguardam'} seu voto.</span>
          </p>
        </div>
        <Link
          href={`/session/${session.id}/vote`}
          className="px-3 py-1.5 bg-brand-teal text-brand-dark text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors shrink-0"
        >
          Votar agora →
        </Link>
      </div>
    )
  }

  return null
}
