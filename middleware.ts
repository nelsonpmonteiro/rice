import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const PROJECT_REF  = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
const AUTH_COOKIE  = `sb-${PROJECT_REF}-auth-token`

/** Lê a sessão diretamente do cookie — sem @supabase/ssr, sem chamada de rede. */
function getSession(request: NextRequest) {
  let raw = request.cookies.get(AUTH_COOKIE)?.value ?? null

  if (!raw) {
    const parts: string[] = []
    for (let i = 0; ; i++) {
      const chunk = request.cookies.get(`${AUTH_COOKIE}.${i}`)?.value
      if (!chunk) break
      parts.push(chunk)
    }
    if (parts.length) raw = parts.join('')
  }

  if (!raw) return null

  try {
    const session = JSON.parse(raw)
    if (!session?.access_token) return null
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now + 60) return null
    return session
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session      = getSession(request)
  const isAuth       = !!session

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth']
  const isPublic    = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!isAuth && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuth && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
