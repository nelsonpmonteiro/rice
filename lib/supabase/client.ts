'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Types ────────────────────────────────────────────────────

export interface Profile {
  id: string
  name: string
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profiles?: Profile
  workspaces?: Workspace
}

export interface Session {
  id: string
  workspace_id: string
  name: string
  description: string | null
  status: 'open' | 'closed'
  voting_open: boolean
  created_at: string
}

export interface Initiative {
  id: string
  session_id: string | null
  workspace_id: string
  title: string
  description: string | null
  position: number
  created_at: string
}

export interface Vote {
  id: string
  initiative_id: string
  user_id: string
  reach: number
  impact: number
  confidence: number
  effort: number
  created_at: string
}

export interface Override {
  id: string
  initiative_id: string
  reach: number | null
  impact: number | null
  confidence: number | null
  effort: number | null
  note: string | null
  updated_at: string
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
