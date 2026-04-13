import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase-server'

// ── Legacy admin password (kept for /admin area backward compat) ──
export function checkAdminPassword(password: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD
  if (!adminPass) return false
  return password === adminPass
}

export function getAdminCookie(
  cookiesObj: { get: (name: string) => { value: string } | undefined }
): boolean {
  const token = cookiesObj.get('rice_admin')?.value
  return token === process.env.ADMIN_PASSWORD
}

// ── User authentication ──────────────────────────────────────

export interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'member'
  group_id: string | null
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username, password_hash, role, group_id')
    .eq('username', username)
    .single()

  if (!user) return null

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return null

  return {
    id: user.id,
    username: user.username,
    role: user.role as 'admin' | 'member',
    group_id: user.group_id,
  }
}

export async function createUserSession(userId: string): Promise<string | null> {
  const token = crypto.randomUUID()
  const { error } = await supabaseAdmin
    .from('user_sessions')
    .insert({ user_id: userId, token })

  if (error) return null
  return token
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const { data: session } = await supabaseAdmin
    .from('user_sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session) return null

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username, role, group_id')
    .eq('id', session.user_id)
    .single()

  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    role: user.role as 'admin' | 'member',
    group_id: user.group_id,
  }
}

export async function deleteUserSession(token: string): Promise<void> {
  await supabaseAdmin.from('user_sessions').delete().eq('token', token)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}
