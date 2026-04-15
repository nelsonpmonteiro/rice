import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

async function getSessionAndMember(sessionId: string, userId: string) {
  const { data: session } = await supabaseAdmin
    .from('sessions').select('*').eq('id', sessionId).single()
  if (!session) return { session: null, member: null }
  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', userId).single()
  return { session, member }
}

// GET /api/sessions/[id]/initiatives — session_initiatives ordered by position
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session, member } = await getSessionAndMember(params.id, auth.user.id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!member)  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Step 1: get junction rows
  const { data: rows } = await supabaseAdmin
    .from('session_initiatives')
    .select('initiative_id, position, added_at')
    .eq('session_id', params.id)
    .order('position', { ascending: true })

  if (!rows || rows.length === 0) return NextResponse.json({ initiatives: [] })

  const initIds = rows.map((r: { initiative_id: string }) => r.initiative_id)

  // Step 2: get initiative details + scores (from the view directly)
  const { data: scores } = await supabaseAdmin
    .from('initiative_scores')
    .select('id, title, description, rice_score')
    .in('id', initIds)

  const scoreMap = Object.fromEntries(
    (scores ?? []).map((s: { id: string; title: string; description: string | null; rice_score: number | null }) =>
      [s.id, s]
    )
  )

  const initiatives = rows.map((r: { initiative_id: string; position: number; added_at: string }) => ({
    initiative_id: r.initiative_id,
    position:      r.position,
    added_at:      r.added_at,
    initiatives:   scoreMap[r.initiative_id] ?? null,
  }))

  return NextResponse.json({ initiatives })
}

// POST /api/sessions/[id]/initiatives — add initiatives to session
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session, member } = await getSessionAndMember(params.id, auth.user.id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.voting_open) return NextResponse.json({ error: 'Pause voting before editing initiatives.' }, { status: 409 })

  const { initiative_ids } = await req.json() as { initiative_ids: string[] }
  if (!Array.isArray(initiative_ids) || initiative_ids.length === 0)
    return NextResponse.json({ error: 'initiative_ids required.' }, { status: 400 })

  // Fetch initiative details to validate workspace
  const { data: initiatives } = await supabaseAdmin
    .from('initiatives')
    .select('id, workspace_id')
    .in('id', initiative_ids)

  // Find current max position
  const { data: existing } = await supabaseAdmin
    .from('session_initiatives')
    .select('position')
    .eq('session_id', params.id)
    .order('position', { ascending: false })
    .limit(1)

  let nextPos = (existing?.[0]?.position ?? -1) + 1

  const results: { id: string; status: 'added' | 'duplicate' | 'conflict' | 'wrong_workspace' }[] = []

  for (const id of initiative_ids) {
    const init = initiatives?.find(i => i.id === id)
    if (!init || init.workspace_id !== session.workspace_id) {
      results.push({ id, status: 'wrong_workspace' }); continue
    }

    // Conflict: already in another session with voting_open = true
    const { data: conflict } = await supabaseAdmin
      .from('session_initiatives')
      .select('session_id, sessions(voting_open)')
      .eq('initiative_id', id)
      .neq('session_id', params.id)

    const hasConflict = (conflict ?? []).some((c: { sessions: { voting_open: boolean }[] | { voting_open: boolean } | null }) => {
      const s = c.sessions
      if (!s) return false
      if (Array.isArray(s)) return s.some(sess => sess.voting_open === true)
      return s.voting_open === true
    })
    if (hasConflict) { results.push({ id, status: 'conflict' }); continue }

    const { error } = await supabaseAdmin
      .from('session_initiatives')
      .insert({ session_id: params.id, initiative_id: id, position: nextPos, added_by: auth.user.id })

    if (error?.code === '23505') { results.push({ id, status: 'duplicate' }); continue }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    results.push({ id, status: 'added' })
    nextPos++
  }

  return NextResponse.json({ results })
}
