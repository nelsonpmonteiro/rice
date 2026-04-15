-- ============================================================
-- RICE v2 — Voting Flow v2
-- Adds: votes.comment, reminders table
-- Drops fixed CHECK constraints on impact/confidence
-- Updates reach CHECK to 0-100 (percentage)
-- Adds partial unique index: (session_id, initiative_id, user_id)
-- ============================================================

-- ── 1. Drop fixed-value CHECK constraints ────────────────────
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_impact_check;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_confidence_check;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_reach_check;

-- ── 2. Re-add permissive constraints ─────────────────────────
-- Reach: percentage 0–100 of client base
ALTER TABLE votes ADD CONSTRAINT votes_reach_check
  CHECK (reach >= 0 AND reach <= 100);

-- Impact: any positive value (RICE multiplier, typically 0.25–3)
ALTER TABLE votes ADD CONSTRAINT votes_impact_check
  CHECK (impact >= 0);

-- Confidence: stored as decimal 0–1 (100% = 1.0)
ALTER TABLE votes ADD CONSTRAINT votes_confidence_check
  CHECK (confidence >= 0 AND confidence <= 1);

-- ── 3. Add comment column ─────────────────────────────────────
ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS comment text
  CHECK (comment IS NULL OR char_length(comment) <= 200);

-- ── 4. Drop legacy unique constraint; add per-session one ─────
-- Old: UNIQUE(initiative_id, user_id)
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_initiative_id_user_id_key;

-- New partial index: one vote per (session, initiative, user) when session_id present
CREATE UNIQUE INDEX IF NOT EXISTS votes_session_initiative_user_idx
  ON votes(session_id, initiative_id, user_id)
  WHERE session_id IS NOT NULL;

-- Legacy fallback (no session): keep initiative+user unique
CREATE UNIQUE INDEX IF NOT EXISTS votes_initiative_user_no_session_idx
  ON votes(initiative_id, user_id)
  WHERE session_id IS NULL;

-- ── 5. Create reminders table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can manage reminders"
  ON reminders FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );

-- ── 6. Realtime ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE reminders;
