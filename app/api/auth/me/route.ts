import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('rice_session')?.value
  if (!token) return NextResponse.json({ user: null })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ user: null })

  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role, group_id: user.group_id },
  })
}
