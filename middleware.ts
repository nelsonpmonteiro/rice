import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Legacy admin area (env-var password) ─────────────────────
  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/api/admin')) {
    if (pathname === '/api/admin/login') return NextResponse.next()

    const adminCookie = req.cookies.get('rice_admin')?.value
    const adminPass   = process.env.ADMIN_PASSWORD

    if (!adminCookie || !adminPass || adminCookie !== adminPass) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  // ── New user auth (username + password) ──────────────────────
  // Protected: / and /session/*
  // Public: /login, /dashboard/*, /admin, /admin/dashboard, /api/*
  const isProtected =
    pathname === '/' ||
    pathname.startsWith('/session/')

  if (isProtected) {
    const sessionToken = req.cookies.get('rice_session')?.value
    if (!sessionToken) {
      const loginUrl = new URL('/login', req.url)
      // Preserve the destination so we can redirect back after login
      if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect /login to / if already authenticated
  if (pathname === '/login') {
    const sessionToken = req.cookies.get('rice_session')?.value
    if (sessionToken) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/session/:path*', '/admin/dashboard/:path*', '/api/admin/:path*'],
}
