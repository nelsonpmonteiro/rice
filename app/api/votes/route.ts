import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { initiative_id, session_id, reach, impact, confidence, effort, comment } = await req.json()

  // ── Validações ───────────────────────────────────────────────
  if (!initiative_id)
    return NextResponse.json({ error: 'initiative_id é obrigatório.' }, { status: 400 })

  // Reach: 0–100 % da base de clientes
  if (typeof reach !== 'number' || reach < 0 || reach > 100)
    return NextResponse.json({ error: 'Alcance deve ser entre 0 e 100.' }, { status: 400 })

  // Impact: valor positivo (multiplicador RICE: 0.25 / 0.5 / 1 / 2 / 3)
  if (typeof impact !== 'number' || impact < 0)
    return NextResponse.json({ error: 'Impacto inválido.' }, { status: 400 })

  // Confidence: 0–1 decimal (80% → 0.8)
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1)
    return NextResponse.json({ error: 'Confiança deve ser entre 0 e 100%.' }, { status: 400 })

  // Effort: > 0 pessoa-mês
  if (typeof effort !== 'number' || effort <= 0)
    return NextResponse.json({ error: 'Esforço deve ser maior que zero.' }, { status: 400 })

  // Comment: optional, max 200 chars
  if (comment !== undefined && comment !== null && comment.length > 200)
    return NextResponse.json({ error: 'Comentário deve ter no máximo 200 caracteres.' }, { status: 400 })

  // ── Verificar membership ─────────────────────────────────────
  const { data: initiative } = await supabaseAdmin
    .from('initiatives').select('workspace_id').eq('id', initiative_id).single()
  if (!initiative)
    return NextResponse.json({ error: 'Iniciativa não encontrada.' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', initiative.workspace_id).eq('user_id', user.id).single()
  if (!member)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  // ── UPSERT ───────────────────────────────────────────────────
  // Use session-scoped unique index when session_id is provided
  const payload = {
    initiative_id,
    session_id:  session_id ?? null,
    user_id:     user.id,
    reach,
    impact,
    confidence,
    effort,
    comment:     comment?.trim() || null,
  }

  const onConflict = session_id
    ? 'session_id,initiative_id,user_id'
    : 'initiative_id,user_id'

  const { data, error } = await supabaseAdmin
    .from('votes')
    .upsert(payload, { onConflict })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
