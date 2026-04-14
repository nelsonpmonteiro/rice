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

  const [wsRes, initRes, sesRes, memRes, draftRes] = await Promise.all([
    supabaseAdmin.from('workspaces').select('*').eq('id', workspaceId).single(),
    supabaseAdmin.from('initiative_scores').select('*').eq('workspace_id', workspaceId).eq('status', 'approved')
      .order('rice_score', { ascending: false, nullsFirst: false }),
    supabaseAdmin.from('sessions').select('*').eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('workspace_members').select('*, profiles(id, name)').eq('workspace_id', workspaceId),
    // Drafts: only fetch for admins
    member.role === 'admin'
      ? supabaseAdmin.from('initiatives').select('*').eq('workspace_id', workspaceId).eq('status', 'draft')
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  return NextResponse.json({
    workspace:   wsRes.data,
    initiatives: initRes.data ?? [],
    sessions:    sesRes.data ?? [],
    members:     memRes.data ?? [],
    drafts:      draftRes.data ?? [],
    myRole:      member.role,
    userId:      user.id,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', params.id).eq('user_id', user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['name', 'description']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('workspaces').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', params.id).eq('user_id', user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin.from('workspaces').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
