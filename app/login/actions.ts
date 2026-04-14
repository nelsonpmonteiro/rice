'use server'

import { createClient } from '@/lib/supabase/server'

export type LoginState = { error: string } | { success: true } | null

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)

  if (!email || !password) {
    return { error: 'E-mail e senha são obrigatórios.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[login] signInWithPassword error:', error.message)
    return { error: error.message }
  }

  console.log('[login] signInWithPassword success, session:', !!data.session, 'user:', data.user?.id)

  return { success: true }
}
