import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — safe to import in client components
export const supabase = createClient(url, anon)

// ── Types ────────────────────────────────────────────────────

export interface Session {
  id: string
  slug: string
  name: string
  description: string | null
  status: 'open' | 'closed'
  voting_open: boolean
  group_id: string | null
  created_at: string
}

export interface Initiative {
  id: string
  session_id: string
  title: string
  description: string | null
  position: number
  created_at: string
}

export interface Vote {
  id: string
  initiative_id: string
  participant: string
  reach: number
  impact: number
  confidence: number
  effort: number
}

export interface Override {
  id: string
  initiative_id: string
  reach: number | null
  impact: number | null
  confidence: number | null
  effort: number | null
  note: string | null
}

export interface InitiativeScore extends Initiative {
  reach: number | null
  impact: number | null
  confidence: number | null
  effort: number | null
  rice_score: number | null
  vote_count: number
  has_override: boolean
  override_note: string | null
}

export interface Group {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface User {
  id: string
  username: string
  group_id: string | null
  role: 'admin' | 'member'
  created_at: string
}
