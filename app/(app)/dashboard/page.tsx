import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'
import ScoreTag, { scoreBg } from '@/components/ui/ScoreTag'
import Badge from '@/components/ui/Badge'
import type { InitiativeScore, Session } from '@/lib/supabase/client'

export default async function DashboardPage() {
  const auth = await requireAuth()
  if (!auth) redirect('/login')

  const { supabase, user } = auth

  // Workspaces do usuário
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name)')
    .eq('user_id', user.id)

  const workspaceIds = (memberships ?? []).map(m => m.workspace_id)

  // Backlog consolidado de todos os workspaces
  let backlog: InitiativeScore[] = []
  let activeSessions: (Session & { workspaceName: string })[] = []

  if (workspaceIds.length > 0) {
    const { data: scores } = await supabase
      .from('initiative_scores')
      .select('*')
      .in('workspace_id', workspaceIds)
      .order('rice_score', { ascending: false, nullsFirst: false })
    backlog = (scores ?? []) as InitiativeScore[]

    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .in('workspace_id', workspaceIds)
      .eq('status', 'open')
    activeSessions = (sessions ?? []).map(s => ({
      ...s,
      workspaceName: (memberships?.find(m => m.workspace_id === s.workspace_id)?.workspaces as unknown as { id: string; name: string } | null)?.name ?? '',
    }))
  }

  const wsMap = Object.fromEntries(
    (memberships ?? []).map(m => [m.workspace_id, (m.workspaces as unknown as { id: string; name: string } | null)?.name ?? ''])
  )

  return (
    <main className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Backlog consolidado de todos os workspaces</p>
      </div>

      {/* Sessões ativas */}
      {activeSessions.filter(s => s.voting_open).length > 0 && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-4 space-y-2">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            Votações abertas agora
          </p>
          <div className="flex flex-wrap gap-2">
            {activeSessions.filter(s => s.voting_open).map(s => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-sm text-emerald-300 hover:bg-emerald-900/50 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {s.name}
                <span className="text-emerald-600 text-xs">{s.workspaceName}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sem workspaces */}
      {workspaceIds.length === 0 && (
        <div className="rounded-xl border border-slate-800 p-10 text-center space-y-3">
          <p className="text-white font-semibold">Bem-vindo ao RICE!</p>
          <p className="text-slate-400 text-sm">Crie seu primeiro workspace para começar a priorizar.</p>
          <p className="text-slate-600 text-xs">Use o botão &ldquo;+ Novo workspace&rdquo; na barra lateral.</p>
        </div>
      )}

      {/* Backlog */}
      {backlog.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Backlog Priorizado
            </h2>
            <span className="text-xs text-slate-600">{backlog.length} itens</span>
          </div>

          {backlog.map((item, idx) => (
            <Link
              key={item.id}
              href={`/workspace/${item.workspace_id}`}
              className={`block rounded-xl border p-4 hover:opacity-90 transition-opacity ${scoreBg(item.rice_score)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-600 text-sm font-mono w-6 shrink-0">#{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{item.title}</p>
                      {item.has_override && (
                        <Badge variant="warning">⚡ ajuste</Badge>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{wsMap[item.workspace_id]}</p>
                  </div>
                </div>
                <ScoreTag value={item.rice_score} />
              </div>
            </Link>
          ))}
        </section>
      )}

      {workspaceIds.length > 0 && backlog.length === 0 && (
        <div className="rounded-xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
          Nenhuma iniciativa ainda. Acesse um workspace para adicionar iniciativas.
        </div>
      )}
    </main>
  )
}
