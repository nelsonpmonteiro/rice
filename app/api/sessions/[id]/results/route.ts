// GET /api/sessions/[id]/results
// Returns ranking (initiative_scores filtered by session) — member + admin
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { data: session } = await supabaseAdmin
    .from('sessions').select('workspace_id, name, status, voting_open').eq('id', params.id).single()
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Ranking: all approved initiatives in workspace ordered by RICE score
  const { data: ranking } = await supabaseAdmin
    .from('initiative_scores')
    .select('id, title, description, rice_score, reach, impact, confidence, effort, vote_count, has_override, override_note')
    .eq('workspace_id', session.workspace_id)
    .eq('status', 'approved')
    .order('rice_score', { ascending: false, nullsFirst: false })

  // Total member count for participation
  const { count: memberCount } = await supabaseAdmin
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', session.workspace_id)

  // How many unique members voted in this session
  const { data: voterData } = await supabaseAdmin
    .from('votes')
    .select('user_id')
    .eq('session_id', params.id)

  const voterCount = new Set((voterData ?? []).map(v => v.user_id)).size

  return NextResponse.json({
    session,
    ranking:      ranking ?? [],
    myRole:       member.role,
    voterCount,
    memberCount:  memberCount ?? 0,
  })
}
