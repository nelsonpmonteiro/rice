'use server'

import { cookies } from 'next/headers'

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Chama a API do Supabase diretamente — sem depender do @supabase/ssr setar cookies
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('[login] auth error:', body)
    const msg: string = body.error_description ?? body.msg ?? body.message ?? 'Credenciais inválidas.'
    return { error: msg }
  }

  const session = await res.json()
  console.log('[login] success, user:', session?.user?.id, 'expires_in:', session?.expires_in)

  // Deriva o nome do cookie igual ao @supabase/ssr: sb-<projectRef>-auth-token
  const projectRef = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const value      = JSON.stringify(session)

  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'
  const opts = {
    path:     '/',
    maxAge:   session.expires_in ?? 3600,
    sameSite: 'lax' as const,
    secure:   isProd,
  }

  // Chunk se necessário (mesmo algoritmo do @supabase/ssr: máx 3600 bytes por cookie)
  const CHUNK = 3600
  if (value.length > CHUNK) {
    const total = Math.ceil(value.length / CHUNK)
    for (let i = 0; i < total; i++) {
      cookieStore.set(`${cookieName}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), opts)
    }
    console.log('[login] cookie chunked into', total, 'parts')
  } else {
    cookieStore.set(cookieName, value, opts)
    console.log('[login] cookie set, name:', cookieName, 'length:', value.length)
  }

  return { success: true }
}
