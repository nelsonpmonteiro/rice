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

// DELETE /api/sessions/[id]/initiatives/[initId]
// Returns { requires_confirmation, vote_count } if votes exist; otherwise deletes immediately.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; initId: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session, member } = await getSessionAndMember(params.id, auth.user.id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.voting_open) return NextResponse.json({ error: 'Pause voting before editing initiatives.' }, { status: 409 })

  // Count votes for this initiative in this session
  const { count } = await supabaseAdmin
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', params.id)
    .eq('initiative_id', params.initId)

  const voteCount = count ?? 0

  if (voteCount > 0) {
    return NextResponse.json({ requires_confirmation: true, vote_count: voteCount })
  }

  // No votes — delete immediately
  const { error } = await supabaseAdmin
    .from('session_initiatives')
    .delete()
    .eq('session_id', params.id)
    .eq('initiative_id', params.initId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
