import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClientBase } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Client para Server Components e Route Handlers — respeita RLS
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            )
          } catch {
            // Server Component não pode setar cookies — ignorar é seguro
          }
        },
      },
    }
  )
}

// Client admin — bypassa RLS via service role key
// NUNCA importar em client components
export const supabaseAdmin = createAdminClientBase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
