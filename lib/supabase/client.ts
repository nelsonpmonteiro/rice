'use client'

import { createClient as createClientBase } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const PROJECT_REF   = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
const AUTH_COOKIE   = `sb-${PROJECT_REF}-auth-token`

/** Lê a sessão completa do cookie (access_token, user, etc.) */
export function getClientSession(): { access_token: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null {
  if (typeof document === 'undefined') return null
  try {
    const map: Record<string, string> = {}
    document.cookie.split(';').forEach(c => {
      const idx = c.indexOf('=')
      if (idx < 0) return
      const k = c.slice(0, idx).trim()
      const v = decodeURIComponent(c.slice(idx + 1).trim())
      map[k] = v
    })
    let raw = map[AUTH_COOKIE] ?? null
    if (!raw) {
      const parts: string[] = []
      for (let i = 0; ; i++) {
        const chunk = map[`${AUTH_COOKIE}.${i}`]
        if (!chunk) break
        parts.push(chunk)
      }
      if (parts.length) raw = parts.join('')
    }
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.access_token || !session?.user) return null
    return session
  } catch {
    return null
  }
}

/**
 * Cliente Supabase para Client Components.
 * Injeta o JWT no header Authorization para que RLS funcione corretamente.
 */
export function createClient() {
  const session = getClientSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

  return createClientBase(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers },
    auth:   { persistSession: false, autoRefreshToken: false },
  })
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
  status: 'draft' | 'open' | 'closed' | 'archived'
  voting_open: boolean
  closed_at: string | null
  created_at: string
}

export interface Initiative {
  id: string
  session_id: string | null
  workspace_id: string
  title: string
  description: string | null
  position: number
  status: 'draft' | 'approved' | 'archived'
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
