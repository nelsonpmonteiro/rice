import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST /api/sessions/[id]/initiatives/[initId]/confirm-remove
// Deletes the session_initiative (and cascades votes) after explicit confirmation.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; initId: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabaseAdmin
    .from('sessions').select('workspace_id, voting_open').eq('id', params.id).single()
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', auth.user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.voting_open) return NextResponse.json({ error: 'Pause voting before editing initiatives.' }, { status: 409 })

  const body = await req.json()
  if (!body.confirmed) return NextResponse.json({ error: 'confirmed: true required.' }, { status: 400 })

  // Delete votes first (session-scoped) then junction row
  await supabaseAdmin
    .from('votes')
    .delete()
    .eq('session_id', params.id)
    .eq('initiative_id', params.initId)

  const { error } = await supabaseAdmin
    .from('session_initiatives')
    .delete()
    .eq('session_id', params.id)
    .eq('initiative_id', params.initId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
