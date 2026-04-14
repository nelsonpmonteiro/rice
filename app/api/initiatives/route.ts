import { NextRequest, NextResponse } from 'next/server'
import { createClient, supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspace_id, session_id, title, description } = await req.json()
  if (!workspace_id || !title?.trim()) {
    return NextResponse.json({ error: 'workspace_id e title são obrigatórios.' }, { status: 400 })
  }

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspace_id).eq('user_id', user.id).single()
  if (member?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem criar iniciativas.' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('initiatives')
    .insert({
      workspace_id,
      session_id: session_id || null,
      title: title.trim(),
      description: description?.trim() || null,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
