// GET /api/sessions/[id]/results/votes/[initiativeId]
// Returns individual votes + dispersion stats for one initiative — admin only
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; initiativeId: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { data: session } = await supabaseAdmin
    .from('sessions').select('workspace_id').eq('id', params.id).single()
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Individual votes
  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select('id, reach, impact, confidence, effort, comment, created_at, profiles(id, name)')
    .eq('session_id', params.id)
    .eq('initiative_id', params.initiativeId)
    .order('created_at', { ascending: true })

  // Dispersion stats via RPC-style raw query
  const { data: stats } = await supabaseAdmin.rpc('votes_dispersion', {
    p_session_id:    params.id,
    p_initiative_id: params.initiativeId,
  })

  return NextResponse.json({ votes: votes ?? [], stats: stats ?? null })
}
