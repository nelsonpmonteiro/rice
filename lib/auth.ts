/**
 * Utilitários de autenticação que leem o cookie diretamente,
 * sem depender do @supabase/ssr (que tem bug com autoRefreshToken: false).
 */

import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const PROJECT_REF   = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
export const AUTH_COOKIE = `sb-${PROJECT_REF}-auth-token`

export interface StoredSession {
  access_token:  string
  refresh_token: string
  token_type:    string
  expires_in:    number
  expires_at:    number
  user:          User
}

/** Lê a sessão do cookie de autenticação (sem chamada de rede). */
export async function getServerSession(): Promise<StoredSession | null> {
  const store = await cookies()

  // Monta o valor — pode estar em chunks (sb-xxx-auth-token.0, .1, ...)
  let raw = store.get(AUTH_COOKIE)?.value ?? null
  if (!raw) {
    const parts: string[] = []
    for (let i = 0; ; i++) {
      const chunk = store.get(`${AUTH_COOKIE}.${i}`)?.value
      if (!chunk) break
      parts.push(chunk)
    }
    if (parts.length) raw = parts.join('')
  }

  if (!raw) return null

  try {
    const session: StoredSession = JSON.parse(raw)
    if (!session?.access_token || !session?.user) return null

    // Verifica expiração (EXPIRY_MARGIN de 60s)
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now + 60) return null

    return session
  } catch {
    return null
  }
}

/**
 * Cria um cliente Supabase autenticado com o JWT do usuário.
 * Usa Authorization header — não depende de cookies no cliente.
 */
export async function createAuthenticatedClient() {
  const session = await getServerSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON, {
    global:   { headers },
    auth:     { persistSession: false, autoRefreshToken: false },
  })
}

/** Retorna { supabase, user } ou null se não autenticado. */
export async function requireAuth() {
  const session = await getServerSession()
  if (!session) return null
  const supabase = await createAuthenticatedClient()
  return { supabase, user: session.user, session }
}
