import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /admin/dashboard and all sub-routes
  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/api/admin')) {
    // Allow login/logout API endpoint itself
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/:path*'],
}
