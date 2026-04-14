import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/** POST — change password */
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { password } = await req.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Clear must_change_password flag if set
  await supabaseAdmin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
