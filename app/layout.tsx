import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RICE — Priorização de Produto',
  description: 'Ferramenta colaborativa de priorização usando o framework RICE',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-brand-dark">{children}</body>
    </html>
  )
}
