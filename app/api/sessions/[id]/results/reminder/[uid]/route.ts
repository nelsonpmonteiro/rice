// POST /api/sessions/[id]/results/reminder/[uid] — admin only, 1 per session
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
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

  // Insert with ON CONFLICT DO NOTHING; if nothing returned → already sent
  const { data, error } = await supabaseAdmin
    .from('reminders')
    .insert({ session_id: params.id, user_id: params.uid })
    .select('id')
    .single()

  if (error) {
    // Unique constraint violation = already sent
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Lembrete já enviado para este membro.' }, { status: 429 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, id: data?.id })
}
