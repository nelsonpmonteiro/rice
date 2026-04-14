import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import type { Workspace } from '@/lib/supabase/client'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth()
  if (!auth) redirect('/login')

  const { user } = auth

  // Usa supabaseAdmin para evitar problemas de RLS com JWT header
  const { data: memberships } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, description, created_by, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  const workspaces = (memberships ?? []).map(m => ({
    workspace_id: m.workspace_id,
    role:         m.role,
    workspaces:   m.workspaces as unknown as Workspace | null,
  }))

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} workspaces={workspaces} />
      <div className="flex-1 overflow-auto min-h-screen">
        {children}
      </div>
    </div>
  )
}
