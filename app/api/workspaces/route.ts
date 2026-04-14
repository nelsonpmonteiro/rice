import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) {
    console.error('[workspaces] requireAuth() returned null — cookie ausente ou expirado')
    return NextResponse.json({ error: 'Não autenticado. Faça login novamente.' }, { status: 401 })
  }
  const { user } = auth

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[workspaces] SUPABASE_SERVICE_ROLE_KEY não está definida')
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
  }

  // Criar workspace + inserir criador como admin (bypass RLS via admin client)
  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .insert({ name: name.trim(), description: description?.trim() || null, created_by: user.id })
    .select()
    .single()

  if (error) {
    console.error('[workspaces] erro ao inserir workspace:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'admin' })

  if (memberError) {
    console.error('[workspaces] erro ao inserir membro:', memberError)
  }

  return NextResponse.json(workspace)
}
