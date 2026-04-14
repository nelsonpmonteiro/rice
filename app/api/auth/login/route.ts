import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': key },
    body:    JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg: string = body.error_description ?? body.msg ?? body.message ?? 'Credenciais inválidas.'
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const session = await res.json()
  const value   = JSON.stringify(session)
  const isProd  = process.env.NODE_ENV === 'production'
  const opts    = { path: '/', maxAge: session.expires_in ?? 3600, sameSite: 'lax' as const, secure: isProd, httpOnly: false }

  const response = NextResponse.json({ ok: true })

  // Chunk se > 3600 bytes (mesmo algoritmo do @supabase/ssr)
  const CHUNK = 3600
  if (value.length > CHUNK) {
    for (let i = 0; i * CHUNK < value.length; i++) {
      response.cookies.set(`${AUTH_COOKIE}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), opts)
    }
  } else {
    response.cookies.set(AUTH_COOKIE, value, opts)
  }

  return response
}
