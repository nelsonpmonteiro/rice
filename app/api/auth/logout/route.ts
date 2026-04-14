import { NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  const opts = { path: '/', maxAge: 0 }

  // Apaga o cookie principal e possíveis chunks
  response.cookies.set(AUTH_COOKIE, '', opts)
  for (let i = 0; i < 10; i++) {
    response.cookies.set(`${AUTH_COOKIE}.${i}`, '', opts)
  }

  return response
}
