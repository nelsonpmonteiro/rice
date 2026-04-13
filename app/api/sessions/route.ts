import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

// Create a new session linked to the user's group
export async function POST(req: NextRequest) {
  const token = req.cookies.get('rice_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem criar sessões.' }, { status: 403 })
  }

  const { name, slug, description } = await req.json()
  if (!name || !slug) {
    return NextResponse.json({ error: 'Nome e slug são obrigatórios.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ name, slug, description: description || null, group_id: user.group_id })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message.includes('unique') ? 'Slug já em uso.' : error.message },
      { status: 400 }
    )
  }

  return NextResponse.json(data)
}

// Patch session (toggle voting, archive) — requires admin
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('rice_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id, ...updates } = body

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .eq('group_id', user.group_id) // scoped to user's group
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
