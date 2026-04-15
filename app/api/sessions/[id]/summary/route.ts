import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/sessions/[id]/summary — participation summary for CloseSessionModal
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabaseAdmin
    .from('sessions').select('workspace_id').eq('id', params.id).single()
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', auth.user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const workspaceId = session.workspace_id

  const [
    { count: memberCount },
    { data: votedUserRows },
    { count: voteCount },
    { count: initiativeCount },
    { data: allMembers },
  ] = await Promise.all([
    supabaseAdmin
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabaseAdmin
      .from('votes')
      .select('user_id')
      .eq('session_id', params.id),
    supabaseAdmin
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', params.id),
    supabaseAdmin
      .from('session_initiatives')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', params.id),
    supabaseAdmin
      .from('workspace_members')
      .select('user_id, profiles(id, name, email)')
      .eq('workspace_id', workspaceId),
  ])

  const votedSet = new Set((votedUserRows ?? []).map((v: { user_id: string }) => v.user_id))
  const voted_count = votedSet.size

  const not_voted = (allMembers ?? [])
    .filter((m: { user_id: string }) => !votedSet.has(m.user_id))
    .map((m: { profiles: { name: string; email: string }[] }) => {
      const p = m.profiles?.[0]
      return { name: p?.name ?? '(sem nome)', email: p?.email ?? '' }
    })

  return NextResponse.json({
    member_count:     memberCount     ?? 0,
    voted_count,
    vote_count:       voteCount       ?? 0,
    initiative_count: initiativeCount ?? 0,
    not_voted,
  })
}
