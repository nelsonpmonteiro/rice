import { NextRequest, NextResponse } from 'next/server'
import { createClient, supabaseAdmin } from '@/lib/supabase/server'

async function isWorkspaceAdmin(userId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()
  return data?.role === 'admin'
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isWorkspaceAdmin(user.id, params.id))) {
    return NextResponse.json({ error: 'Apenas admins podem editar o workspace.' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, string> = {}
  if (body.name)        updates.name        = body.name.trim()
  if ('description' in body) updates.description = body.description?.trim() || null

  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isWorkspaceAdmin(user.id, params.id))) {
    return NextResponse.json({ error: 'Apenas admins podem excluir o workspace.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('workspaces').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
