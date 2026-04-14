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
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Não chamar redirect() aqui — useFormState intercepta antes do Next.js processar.
  // Os cookies de sessão já foram setados via Set-Cookie no response desta Server Action.
  // O client detecta { success: true } e navega com window.location.href (full reload).
  return { success: true }
}
