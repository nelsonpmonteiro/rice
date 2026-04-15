// GET /api/sessions/[id]/results/users — admin only, participation list
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
    .from('sessions').select('workspace_id').eq('id', params.id).single()
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // All workspace members + whether they voted in this session
  const { data: members } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, role, profiles(id, name, email)')
    .eq('workspace_id', session.workspace_id)

  // Unique voters in this session
  const { data: voterRows } = await supabaseAdmin
    .from('votes')
    .select('user_id')
    .eq('session_id', params.id)

  const voterSet = new Set((voterRows ?? []).map(v => v.user_id))

  const list = (members ?? []).map(m => ({
    user_id: m.user_id,
    role:    m.role,
    name:    (m.profiles as unknown as { name: string; email: string } | null)?.name ?? 'Usuário',
    email:   (m.profiles as unknown as { name: string; email: string } | null)?.email ?? '',
    voted:   voterSet.has(m.user_id),
  }))

  return NextResponse.json({ users: list })
}
