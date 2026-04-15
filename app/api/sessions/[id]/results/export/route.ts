// GET /api/sessions/[id]/results/export — admin only, CSV download
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(cols: unknown[]): string {
  return cols.map(escapeCSV).join(',')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { data: session } = await supabaseAdmin
    .from('sessions').select('workspace_id, name').eq('id', params.id).single()
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', session.workspace_id).eq('user_id', user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select(`
      reach, impact, confidence, effort, comment, created_at,
      initiatives(title),
      profiles(name, email)
    `)
    .eq('session_id', params.id)
    .order('created_at', { ascending: true })

  const header = row([
    'member_name', 'member_email', 'initiative_title',
    'reach', 'impact', 'confidence', 'effort',
    'comment', 'score_individual', 'voted_at',
  ])

  const lines = (votes ?? []).map(v => {
    const score = v.effort > 0
      ? Math.round((v.reach * v.impact * v.confidence) / v.effort * 10) / 10
      : null
    const p = v.profiles as unknown as { name: string; email: string } | null
    const i = v.initiatives as unknown as { title: string } | null
    return row([
      p?.name ?? '',
      p?.email ?? '',
      i?.title ?? '',
      v.reach,
      v.impact,
      Math.round(v.confidence * 100),   // store as decimal, export as %
      v.effort,
      v.comment ?? '',
      score ?? '',
      v.created_at,
    ])
  })

  const csv  = [header, ...lines].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  const filename = `rice-session-${params.id.slice(0, 8)}-${date}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
