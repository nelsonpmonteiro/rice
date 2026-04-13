// Server-only Supabase client — bypasses RLS via service role key.
// NEVER import this in client components or pages marked 'use client'.
import { createClient } from '@supabase/supabase-js'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(url, service)
