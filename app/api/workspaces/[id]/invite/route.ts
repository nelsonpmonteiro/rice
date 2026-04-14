import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

async function requireAdmin(userId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId).eq('user_id', userId).single()
  return data?.role === 'admin'
}

function newToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
}

/** GET — return current invite status + token (admin only) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await requireAdmin(auth.user.id, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('workspaces').select('invite_token, invite_active').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

/** POST — enable invite link; pass { regenerate: true } to also rotate the token */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await requireAdmin(auth.user.id, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body      = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = { invite_active: true }

  // Rotate token if explicitly requested, or if none exists yet
  const { data: ws } = await supabaseAdmin
    .from('workspaces').select('invite_token').eq('id', params.id).single()

  if (body.regenerate || !ws?.invite_token) {
    updates.invite_token = newToken()
  }

  const { data, error } = await supabaseAdmin
    .from('workspaces').update(updates).eq('id', params.id)
    .select('invite_token, invite_active').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

/** DELETE — disable invite link */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await requireAdmin(auth.user.id, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('workspaces').update({ invite_active: false }).eq('id', params.id)
    .select('invite_token, invite_active').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
