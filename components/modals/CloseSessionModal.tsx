'use client'

import { useEffect, useState } from 'react'

type Summary = {
  member_count:     number
  voted_count:      number
  vote_count:       number
  initiative_count: number
  not_voted:        { name: string; email: string }[]
}

export default function CloseSessionModal({
  sessionId,
  sessionName,
  onClose,
  onConfirmed,
}: {
  sessionId:   string
  sessionName: string
  onClose:     () => void
  onConfirmed: () => void
}) {
  const [summary,   setSummary]   = useState<Summary | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [checked,   setChecked]   = useState(false)
  const [closing,   setClosing]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/summary`)
      .then(r => r.json())
      .then(d => { setSummary(d); setLoading(false) })
      .catch(() => { setError('Erro ao carregar resumo.'); setLoading(false) })
  }, [sessionId])

  async function handleClose() {
    if (!checked) return
    setClosing(true)
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'closed' }),
    })
    setClosing(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro ao encerrar sessão.')
      return
    }
    onConfirmed()
  }

  const notVotedCount = summary ? summary.member_count - summary.voted_count : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl w-full max-w-md space-y-5 p-6 shadow-2xl">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Encerrar sessão definitivamente?</h2>
          <p className="text-sm text-red-400 font-medium">
            Esta ação é irreversível. A votação não poderá ser reaberta.
          </p>
        </div>

        {/* Summary */}
        {loading ? (
          <div className="text-slate-500 text-sm py-4 text-center">Carregando resumo…</div>
        ) : summary ? (
          <div className="space-y-3">
            {/* Participation bar */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Participação</span>
                <span className="text-white font-semibold">
                  {summary.voted_count}/{summary.member_count} membros
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: summary.member_count > 0 ? `${(summary.voted_count / summary.member_count) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{summary.initiative_count} iniciativa{summary.initiative_count !== 1 ? 's' : ''}</span>
                <span>{summary.vote_count} voto{summary.vote_count !== 1 ? 's' : ''} registrado{summary.vote_count !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Non-voters */}
            {summary.not_voted.length > 0 && (
              <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  {summary.not_voted.length} membro{summary.not_voted.length !== 1 ? 's' : ''} sem voto
                </p>
                <ul className="space-y-1 max-h-28 overflow-y-auto">
                  {summary.not_voted.map((m, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-medium">{m.name}</span>
                      <span className="text-slate-500 truncate">{m.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                  ${checked ? 'bg-red-500 border-red-500' : 'border-slate-600 bg-slate-900 group-hover:border-slate-400'}`}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-300 leading-snug">
                Entendo que esta ação é irreversível
                {notVotedCount > 0 && ` e que ${notVotedCount} membro${notVotedCount !== 1 ? 's' : ''} ainda não votaram`}.
              </span>
            </label>
          </div>
        ) : null}

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={closing}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleClose}
            disabled={!checked || closing || loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40
              bg-red-600 hover:bg-red-500 text-white disabled:bg-red-900"
          >
            {closing ? 'Encerrando…' : 'Encerrar sessão'}
          </button>
        </div>
      </div>
    </div>
  )
}
