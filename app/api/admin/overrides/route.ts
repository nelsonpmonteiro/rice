import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAdminCookie } from '@/lib/auth'
import { cookies } from 'next/headers'

function isAdmin() {
  return getAdminCookie(cookies())
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  // Upsert: insert or update based on initiative_id uniqueness
  const { data, error } = await supabaseAdmin
    .from('overrides')
    .upsert({
      initiative_id: body.initiative_id,
      reach:         body.reach      ?? null,
      impact:        body.impact     ?? null,
      confidence:    body.confidence ?? null,
      effort:        body.effort     ?? null,
      note:          body.note       ?? null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'initiative_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { error } = await supabaseAdmin
    .from('overrides')
    .delete()
    .eq('initiative_id', body.initiative_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
