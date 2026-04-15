// GET /api/sessions/[id]/results/users/[uid] — admin only, votes of one user
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; uid: string } }
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

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('name, email').eq('id', params.uid).single()

  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select('initiative_id, reach, impact, confidence, effort, comment, created_at, initiatives(title)')
    .eq('session_id', params.id)
    .eq('user_id', params.uid)
    .order('created_at', { ascending: true })

  return NextResponse.json({ profile, votes: votes ?? [] })
}
