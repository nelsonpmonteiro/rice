'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Workspace } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import CreateWorkspaceModal from '@/components/modals/CreateWorkspaceModal'

export default function Sidebar({
  user,
  workspaces,
}: {
  user: User
  workspaces: { workspace_id: string; role: string; workspaces: Workspace | null }[]
}) {
  const pathname = usePathname()
  const [showCreate, setShowCreate] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const userName = (user.user_metadata?.name as string) || user.email || 'Usuário'

  return (
    <>
      <aside className="w-60 shrink-0 bg-brand-mid border-r border-slate-800 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <span className="text-2xl font-black text-brand-teal">RICE</span>
          <p className="text-xs text-slate-500 mt-0.5">Priorização colaborativa</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
              ${pathname === '/dashboard'
                ? 'bg-brand-teal/20 text-brand-teal font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            Dashboard
          </Link>

          {workspaces.length > 0 && (
            <div className="pt-3">
              <p className="text-xs text-slate-600 uppercase tracking-widest px-3 mb-1">Workspaces</p>
              {workspaces.map(({ workspace_id, role, workspaces: ws }) => {
                if (!ws) return null
                const active = pathname.startsWith(`/workspace/${workspace_id}`)
                const avatarColors = [
                  'bg-violet-700', 'bg-sky-700', 'bg-emerald-700',
                  'bg-amber-700',  'bg-rose-700', 'bg-teal-700',
                ]
                const colorIdx = workspace_id.charCodeAt(workspace_id.length - 1) % avatarColors.length
                const initial  = ws.name.charAt(0).toUpperCase()
                return (
                  <Link
                    key={workspace_id}
                    href={`/workspace/${workspace_id}`}
                    title={ws.name}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                      ${active
                        ? 'bg-brand-teal/20 text-brand-teal font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-md ${avatarColors[colorIdx]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                        {initial}
                      </span>
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {role === 'admin' && (
                      <span className="text-[10px] text-brand-teal/60 shrink-0 ml-1">admin</span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}

          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-brand-teal hover:bg-slate-800 transition-colors"
          >
            + Novo workspace
          </button>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-slate-600 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-xs text-slate-600 hover:text-white transition-colors ml-2 shrink-0"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { window.location.href = '/dashboard' }}
        />
      )}
    </>
  )
}
