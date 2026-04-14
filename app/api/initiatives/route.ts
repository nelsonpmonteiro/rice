import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { workspace_id, session_id, title, description } = await req.json()
  if (!workspace_id || !title?.trim()) {
    return NextResponse.json({ error: 'workspace_id e title são obrigatórios.' }, { status: 400 })
  }

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspace_id).eq('user_id', user.id).single()
  if (!member) {
    return NextResponse.json({ error: 'Você não é membro deste workspace.' }, { status: 403 })
  }

  // Admins create as 'approved'; regular members submit as 'draft' for review
  const status = member.role === 'admin' ? 'approved' : 'draft'

  const { data, error } = await supabaseAdmin
    .from('initiatives')
    .insert({
      workspace_id,
      session_id: member.role === 'admin' ? (session_id || null) : null,
      title: title.trim(),
      description: description?.trim() || null,
      status,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
