'use client'

import { useState } from 'react'

export default function ExportButton({ sessionId }: { sessionId: string }) {
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    const res = await fetch(`/api/sessions/${sessionId}/results/export`)
    if (res.ok) {
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const filename = res.headers.get('Content-Disposition')
        ?.match(/filename="(.+)"/)?.[1] ?? 'rice-export.csv'
      const a = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(false)
  }

  return (
    <button
      onClick={download}
      disabled={downloading}
      className="flex items-center gap-2 px-4 py-2 border border-slate-700 text-slate-400 text-sm
                 font-semibold rounded-xl hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {downloading ? 'Exportando…' : 'Exportar CSV'}
    </button>
  )
}
