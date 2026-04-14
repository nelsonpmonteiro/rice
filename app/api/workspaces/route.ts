import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  // Criar workspace + inserir criador como admin (bypass RLS via admin client)
  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .insert({ name: name.trim(), description: description?.trim() || null, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabaseAdmin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'admin' })

  return NextResponse.json(workspace)
}
