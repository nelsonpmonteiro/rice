import { NextRequest, NextResponse } from 'next/server'
import { createClient, supabaseAdmin } from '@/lib/supabase/server'

async function getAdminCount(workspaceId: string) {
  const { count } = await supabaseAdmin
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('role', 'admin')
  return count ?? 0
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; uid: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', params.id).eq('user_id', user.id).single()
  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem alterar roles.' }, { status: 403 })
  }

  const { role } = await req.json()
  if (!['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Role inválido.' }, { status: 400 })
  }

  // Não rebaixar o único admin
  if (role === 'member') {
    const { data: target } = await supabaseAdmin
      .from('workspace_members').select('role')
      .eq('workspace_id', params.id).eq('user_id', params.uid).single()
    if (target?.role === 'admin' && (await getAdminCount(params.id)) <= 1) {
      return NextResponse.json(
        { error: 'Não é possível rebaixar o único administrador.' }, { status: 409 }
      )
    }
  }

  const { error } = await supabaseAdmin
    .from('workspace_members').update({ role })
    .eq('workspace_id', params.id).eq('user_id', params.uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; uid: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isSelf = user.id === params.uid
  const { data: caller } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', params.id).eq('user_id', user.id).single()

  if (!isSelf && caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem remover membros.' }, { status: 403 })
  }

  // Não remover o único admin
  const { data: target } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', params.id).eq('user_id', params.uid).single()
  if (target?.role === 'admin' && (await getAdminCount(params.id)) <= 1) {
    return NextResponse.json(
      { error: 'Não é possível remover o único administrador.' }, { status: 409 }
    )
  }

  const { error } = await supabaseAdmin
    .from('workspace_members')
    .delete().eq('workspace_id', params.id).eq('user_id', params.uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
