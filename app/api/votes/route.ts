import { NextRequest, NextResponse } from 'next/server'
import { createClient, supabaseAdmin } from '@/lib/supabase/server'

const IMPACT_VALUES     = [0.25, 0.5, 1, 2, 3]
const CONFIDENCE_VALUES = [0.5, 0.8, 1.0]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { initiative_id, reach, impact, confidence, effort } = await req.json()

  // Validações
  if (!initiative_id) return NextResponse.json({ error: 'initiative_id é obrigatório.' }, { status: 400 })
  if (typeof reach !== 'number' || reach < 0) return NextResponse.json({ error: 'Reach inválido.' }, { status: 400 })
  if (!IMPACT_VALUES.includes(impact)) return NextResponse.json({ error: 'Impact inválido.' }, { status: 400 })
  if (!CONFIDENCE_VALUES.includes(confidence)) return NextResponse.json({ error: 'Confidence inválido.' }, { status: 400 })
  if (typeof effort !== 'number' || effort <= 0) return NextResponse.json({ error: 'Effort inválido.' }, { status: 400 })

  // Verificar que user é membro do workspace da iniciativa
  const { data: initiative } = await supabaseAdmin
    .from('initiatives').select('workspace_id').eq('id', initiative_id).single()
  if (!initiative) return NextResponse.json({ error: 'Iniciativa não encontrada.' }, { status: 404 })

  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('role')
    .eq('workspace_id', initiative.workspace_id).eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('votes')
    .upsert({ initiative_id, user_id: user.id, reach, impact, confidence, effort },
             { onConflict: 'initiative_id,user_id' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
