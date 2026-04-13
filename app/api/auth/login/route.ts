import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, createUserSession, deleteUserSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Usuário e senha obrigatórios.' }, { status: 400 })
  }

  const user = await authenticateUser(username, password)
  if (!user) {
    return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })
  }

  const token = await createUserSession(user.id)
  if (!token) {
    return NextResponse.json({ error: 'Erro ao iniciar sessão.' }, { status: 500 })
  }

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, username: user.username, role: user.role, group_id: user.group_id },
  })

  res.cookies.set('rice_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return res
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('rice_session')?.value
  if (token) await deleteUserSession(token)

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('rice_session')
  return res
}
