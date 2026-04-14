'use client'

import { useState } from 'react'

// ── Modes ─────────────────────────────────────────────────────────────────────
// "name"     → user must type the resource name before Delete is enabled
// "checkbox" → user must tick a checkbox before Delete is enabled
// "simple"   → confirm button is always enabled
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  title:   string
  message: string
  onConfirm: () => void
  onClose:   () => void
  loading?:  boolean
} & (
  | { mode: 'name';     confirmName: string }
  | { mode: 'checkbox'; checkboxLabel: string }
  | { mode?: 'simple' }
)

export default function ConfirmDeleteModal(props: Props) {
  const { title, message, onConfirm, onClose, loading } = props

  const [typed,   setTyped]   = useState('')
  const [checked, setChecked] = useState(false)

  const mode = props.mode ?? 'simple'

  const canConfirm =
    mode === 'name'     ? typed.trim() === (props as { confirmName: string }).confirmName :
    mode === 'checkbox' ? checked :
    true

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">

        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-slate-400 text-sm mt-1">{message}</p>
        </div>

        {mode === 'name' && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500">
              Digite <span className="text-white font-semibold">
                {(props as { confirmName: string }).confirmName}
              </span> para confirmar:
            </p>
            <input
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canConfirm) onConfirm() }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white
                         focus:outline-none focus:border-red-500 placeholder:text-slate-600"
              placeholder={(props as { confirmName: string }).confirmName}
            />
          </div>
        )}

        {mode === 'checkbox' && (
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 accent-red-500 w-4 h-4 shrink-0"
            />
            <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
              {(props as { checkboxLabel: string }).checkboxLabel}
            </span>
          </label>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className="px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-xl
                       hover:bg-red-500 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>

      </div>
    </div>
  )
}
