import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/workspaces/[id]/initiatives?status=approved&session_id=xxx
// Returns workspace initiatives with optional status filter.
// When session_id is provided, marks each initiative with:
//   - in_session: true if already in this session
//   - conflicting: true if in another session with voting_open=true
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', params.id).eq('user_id', auth.user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status')
  const sessionId    = url.searchParams.get('session_id')

  // Fetch initiatives (via initiative_scores view for rice_score)
  let query = supabaseAdmin
    .from('initiative_scores')
    .select('id, title, description, status, workspace_id, rice_score, vote_count, created_at')
    .eq('workspace_id', params.id)
    .order('rice_score', { ascending: false, nullsFirst: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: initiatives, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (!sessionId || !(initiatives ?? []).length) {
    return NextResponse.json({ initiatives: initiatives ?? [] })
  }

  // Fetch IDs already in this session
  const { data: sessionInits } = await supabaseAdmin
    .from('session_initiatives')
    .select('initiative_id')
    .eq('session_id', sessionId)

  const inSessionSet = new Set((sessionInits ?? []).map((r: { initiative_id: string }) => r.initiative_id))

  // Fetch IDs conflicting (in another active session)
  const { data: conflictRows } = await supabaseAdmin
    .from('session_initiatives')
    .select('initiative_id, sessions(voting_open)')
    .neq('session_id', sessionId)

  const conflictSet = new Set(
    (conflictRows ?? [])
      .filter((r: { sessions: { voting_open: boolean } | null }) => r.sessions?.voting_open === true)
      .map((r: { initiative_id: string }) => r.initiative_id)
  )

  const enriched = (initiatives ?? []).map(init => ({
    ...init,
    in_session:  inSessionSet.has(init.id),
    conflicting: conflictSet.has(init.id) && !inSessionSet.has(init.id),
  }))

  return NextResponse.json({ initiatives: enriched })
}
