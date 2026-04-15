-- ============================================================
-- RICE v2 — Session Compose & Close
-- Adds: sessions.status draft/archived values + closed_at column
-- Adds: session_initiatives.id column for row-level identification
-- ============================================================

-- ── 1. Extend sessions.status to include 'draft' and 'archived' ──
-- Drop old check constraint if any exists (original schema uses text with no CHECK)
-- Add closed_at column
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Update status column default to 'draft' for new sessions
ALTER TABLE sessions
  ALTER COLUMN status SET DEFAULT 'draft';

-- Existing sessions without explicit status stay 'open' (already migrated)
-- No data migration needed since the column is unconstrained text.

-- ── 2. Add id column to session_initiatives ──────────────────
-- The junction table currently uses (session_id, initiative_id) composite PK.
-- Adding a surrogate id for convenience.
ALTER TABLE session_initiatives
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;

-- ── 3. Ensure realtime is enabled for new tables ─────────────
-- (session_initiatives was added in 004; votes already enabled)
-- Nothing new needed — already done in 004.
