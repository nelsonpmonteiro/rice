import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/** PATCH — update profile name */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const body = await req.json()
  const { name } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  // Update profile
  const { error: profErr } = await supabaseAdmin
    .from('profiles').update({ name: name.trim() }).eq('id', user.id)
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 })

  // Also update auth metadata
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata ?? {}), name: name.trim() },
  })

  return NextResponse.json({ ok: true })
}

/** DELETE — delete account */
export async function DELETE(_req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  // Supabase admin delete — cascades to profiles (ON DELETE CASCADE)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
