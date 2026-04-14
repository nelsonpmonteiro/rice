import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth
  const { id: workspaceId } = params

  // Verifica se o usuário é membro
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [wsRes, initRes, sesRes, memRes] = await Promise.all([
    supabaseAdmin.from('workspaces').select('*').eq('id', workspaceId).single(),
    supabaseAdmin.from('initiative_scores').select('*').eq('workspace_id', workspaceId)
      .order('rice_score', { ascending: false, nullsFirst: false }),
    supabaseAdmin.from('sessions').select('*').eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('workspace_members').select('*, profiles(id, name)').eq('workspace_id', workspaceId),
  ])

  return NextResponse.json({
    workspace:   wsRes.data,
    initiatives: initRes.data ?? [],
    sessions:    sesRes.data ?? [],
    members:     memRes.data ?? [],
    myRole:      member.role,
    userId:      user.id,
  })
}
