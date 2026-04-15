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

  // State transition validations
  if (updates.status) {
    const { data: current } = await supabaseAdmin
      .from('sessions').select('status, voting_open').eq('id', params.id).single()

    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const from = current.status as string
    const to   = updates.status as string

    if (from === 'archived') {
      return NextResponse.json({ error: 'Sessões arquivadas não podem ser alteradas.' }, { status: 400 })
    }
    if (from === 'closed' && to !== 'archived') {
      return NextResponse.json({ error: 'Sessão encerrada é irreversível. Só pode ser arquivada.' }, { status: 400 })
    }
    if (from === 'open' && to === 'archived') {
      return NextResponse.json({ error: 'Encerre a sessão antes de arquivar.' }, { status: 400 })
    }
    if (from === 'draft' && to === 'open') {
      const { count } = await supabaseAdmin
        .from('session_initiatives')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', params.id)
      if ((count ?? 0) < 1) {
        return NextResponse.json({ error: 'Adicione pelo menos uma iniciativa antes de publicar.' }, { status: 400 })
      }
    }

    // Auto-set closed_at + close voting when closing
    if (to === 'closed') {
      updates.closed_at   = new Date().toISOString()
      updates.voting_open = false
    }
  }

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
