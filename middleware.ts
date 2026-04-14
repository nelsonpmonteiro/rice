import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // supabaseResponse é mutável: setAll pode recriá-lo com os cookies refreshados
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Atualiza os cookies no request para que o resto do middleware os veja
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Recria supabaseResponse com os cookies atualizados (token refresh)
          supabaseResponse = NextResponse.next({ request })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  // getSession() valida o JWT localmente sem chamada de rede — adequado para roteamento
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password']
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANTE: retornar supabaseResponse para propagar cookies de token refresh
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
