import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

async function requireAdmin(userId: string, sessionId: string) {
  const { data: session } = await supabaseAdmin
    .from('sessions').select('workspace_id').eq('id', sessionId).single()
  if (!session) return false

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', userId).single()
  return member?.role === 'admin'
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth
  if (!(await requireAdmin(user.id, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id: _id, ...updates } = body

  const { data, error } = await supabaseAdmin
    .from('sessions').update(updates).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth
  if (!(await requireAdmin(user.id, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('sessions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
