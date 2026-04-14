import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  // Find workspace with this token (must be active)
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, invite_active')
    .eq('invite_token', params.token)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 })
  }
  if (!workspace.invite_active) {
    return NextResponse.json({ error: 'Este link de convite foi desativado.' }, { status: 410 })
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspace.id).eq('user_id', user.id).single()

  if (existing) {
    return NextResponse.json({ workspace_id: workspace.id, already_member: true })
  }

  // Add as member via invite
  const { error } = await supabaseAdmin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id:      user.id,
    role:         'member',
    joined_via:   'invite',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ workspace_id: workspace.id, workspace_name: workspace.name })
}
