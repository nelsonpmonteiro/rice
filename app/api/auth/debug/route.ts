import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll()
  const authCookies = allCookies.filter(c => c.name.includes('sb-') || c.name.includes('supabase'))

  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    authCookies: authCookies.map(c => ({ name: c.name, length: c.value.length })),
    hasSession: !!session,
    sessionError: error?.message ?? null,
    userId: session?.user?.id ?? null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) ?? 'NOT SET',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}
