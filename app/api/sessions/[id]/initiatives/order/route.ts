import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

// PATCH /api/sessions/[id]/initiatives/order
// Body: { order: [{ initiative_id: string, position: number }] }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
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
  if (session.voting_open) return NextResponse.json({ error: 'Pause voting before reordering initiatives.' }, { status: 409 })

  const body = await req.json() as { order: { initiative_id: string; position: number }[] }
  if (!Array.isArray(body.order) || body.order.length === 0) {
    return NextResponse.json({ error: 'order array required.' }, { status: 400 })
  }

  const updates = body.order.map(({ initiative_id, position }) =>
    supabaseAdmin
      .from('session_initiatives')
      .update({ position })
      .eq('session_id', params.id)
      .eq('initiative_id', initiative_id)
  )

  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
