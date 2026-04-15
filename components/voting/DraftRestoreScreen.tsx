'use client'

export default function DraftRestoreScreen({
  sessionName,
  draftIndex,
  total,
  onContinue,
  onRestart,
}: {
  sessionName: string
  draftIndex:  number
  total:       number
  onContinue:  () => void
  onRestart:   () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      <div className="bg-brand-mid border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-amber-900/30 flex items-center justify-center mx-auto text-2xl">📝</div>
        <div>
          <h2 className="text-lg font-bold text-white">Rascunho encontrado</h2>
          <p className="text-slate-400 text-sm mt-1">
            Você tem um rascunho de <span className="text-white font-medium">{sessionName}</span> salvo.
            Você estava na iniciativa <span className="text-brand-teal font-semibold">{draftIndex + 1} de {total}</span>.
          </p>
        </div>
        <div className="space-y-2">
          <button
            onClick={onContinue}
            className="w-full px-5 py-2.5 bg-brand-teal text-brand-dark text-sm font-bold rounded-xl hover:bg-cyan-300 transition-colors"
          >
            Continuar de onde parei →
          </button>
          <button
            onClick={onRestart}
            className="w-full px-5 py-2 text-sm text-slate-500 hover:text-white transition-colors"
          >
            Começar do zero
          </button>
        </div>
      </div>
    </div>
  )
}
