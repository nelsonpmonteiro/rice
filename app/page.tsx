import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/lib/supabase'

export const revalidate = 30

async function getSessions(): Promise<Session[]> {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function HomePage() {
  const sessions = await getSessions()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-5xl font-black tracking-tight text-brand-teal">RICE</span>
          <p className="text-slate-400 text-sm">Ferramenta colaborativa de priorização de produto</p>
        </div>

        {/* Session list */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Sessões abertas
          </h2>

          {sessions.length === 0 && (
            <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
              Nenhuma sessão aberta no momento.
            </div>
          )}

          {sessions.map(s => (
            <Link
              key={s.id}
              href={`/session/${s.slug}`}
              className="block rounded-xl border border-slate-800 bg-brand-mid p-5 hover:border-brand-teal hover:bg-brand-accent/20 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white group-hover:text-brand-teal transition-colors">{s.name}</p>
                  {s.description && (
                    <p className="text-slate-400 text-sm mt-0.5">{s.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {s.voting_open && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Votação aberta
                    </span>
                  )}
                  <span className="text-slate-600 group-hover:text-brand-teal transition-colors">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link href="/admin" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Área administrativa →
          </Link>
        </div>
      </div>
    </main>
  )
}
