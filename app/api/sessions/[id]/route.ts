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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { data: session } = await supabaseAdmin
    .from('sessions').select('*').eq('id', params.id).single()
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Busca todas as iniciativas do workspace — a sessão é uma rodada de
  // votação para o backlog completo, não um subconjunto com session_id fixo
  const { data: initiatives } = await supabaseAdmin
    .from('initiative_scores').select('*').eq('workspace_id', session.workspace_id)
    .order('rice_score', { ascending: false, nullsFirst: false })

  const initIds = (initiatives ?? []).map((i: { id: string }) => i.id)
  const { data: votes } = initIds.length > 0
    ? await supabaseAdmin.from('votes').select('*').eq('user_id', user.id).in('initiative_id', initIds)
    : { data: [] }

  // Participation counts (used by voting flow pages)
  const [{ data: voterRows }, { count: memberCount }] = await Promise.all([
    supabaseAdmin.from('votes').select('user_id').eq('session_id', params.id),
    supabaseAdmin.from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', session.workspace_id),
  ])
  const voterCount = new Set((voterRows ?? []).map((v: { user_id: string }) => v.user_id)).size

  return NextResponse.json({
    session,
    initiatives: initiatives ?? [],
    myVotes:     votes ?? [],
    myRole:      member.role,
    userId:      user.id,
    voterCount,
    memberCount: memberCount ?? 0,
  })
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
