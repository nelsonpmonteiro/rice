import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll()
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
    .replace(/^https?:\/\//, '').split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  const rawCookie = req.cookies.get(cookieName)?.value ?? null

  // Tenta parsear o valor do cookie manualmente
  let cookieParsed: Record<string, unknown> | string | null = null
  let parseError: string | null = null
  if (rawCookie) {
    try {
      cookieParsed = JSON.parse(rawCookie)
    } catch (e) {
      parseError = String(e)
      // Tenta base64
      try {
        cookieParsed = JSON.parse(Buffer.from(rawCookie, 'base64').toString())
        parseError = 'raw JSON failed, but base64 worked'
      } catch {
        cookieParsed = null
      }
    }
  }

  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  return NextResponse.json({
    cookieName,
    cookiePresent:  !!rawCookie,
    cookieLength:   rawCookie?.length ?? 0,
    cookieFirst100: rawCookie?.slice(0, 100) ?? null,
    parseError,
    cookieFields:   cookieParsed && typeof cookieParsed === 'object' ? Object.keys(cookieParsed) : null,
    hasAccessToken: cookieParsed && typeof cookieParsed === 'object' ? !!( cookieParsed as Record<string,unknown>).access_token : false,
    expiresAt:      cookieParsed && typeof cookieParsed === 'object' ? (cookieParsed as Record<string,unknown>).expires_at : null,
    hasSession:     !!session,
    sessionError:   error?.message ?? null,
    allCookieNames: allCookies.map(c => c.name),
    supabaseUrl:    process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 50),
  })
}
