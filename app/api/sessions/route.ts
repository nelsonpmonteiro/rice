import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { workspace_id, name, description } = await req.json()
  if (!workspace_id || !name?.trim()) {
    return NextResponse.json({ error: 'workspace_id e name são obrigatórios.' }, { status: 400 })
  }

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspace_id).eq('user_id', user.id).single()
  if (member?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem criar sessões.' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ workspace_id, name: name.trim(), description: description?.trim() || null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
