import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  // Verificar que o chamador é admin do workspace
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (member?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem convidar membros.' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })

  // Buscar user_id pelo email (requer service role — auth.users não é acessível com anon key)
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const target = users.find(u => u.email === email)
  if (!target) {
    return NextResponse.json({ error: 'Usuário não encontrado. Peça para ele criar uma conta.' }, { status: 404 })
  }

  // Verificar se já é membro
  const { data: existing } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', params.id)
    .eq('user_id', target.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Usuário já é membro deste workspace.' }, { status: 409 })
  }

  const { error } = await supabaseAdmin
    .from('workspace_members')
    .insert({ workspace_id: params.id, user_id: target.id, role: 'member' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
