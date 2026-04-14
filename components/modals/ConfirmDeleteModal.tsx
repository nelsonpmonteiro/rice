'use client'

export default function ConfirmDeleteModal({
  title,
  message,
  onConfirm,
  onClose,
  loading,
}: {
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-slate-400 text-sm">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}
