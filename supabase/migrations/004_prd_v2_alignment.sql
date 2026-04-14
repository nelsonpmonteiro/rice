-- ============================================================
-- RICE v2 — PRD Alignment
-- Adds: session_initiatives, votes.session_id,
--       initiatives.status, profiles extras,
--       workspaces invite fields, workspace_members.joined_via
-- All changes are backward-compatible (existing rows preserved).
-- ============================================================

-- ── 1. initiatives.status ─────────────────────────────────────
-- 'approved' = visible to all (default keeps existing rows working)
-- 'draft'    = pending admin approval
-- 'archived' = soft-deleted / hidden
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
  CHECK (status IN ('draft', 'approved', 'archived'));

-- ── 2. session_initiatives (junction table) ───────────────────
-- Replaces the direct session_id FK on initiatives for the many-to-many model.
-- The old initiatives.session_id column stays (nullable) so existing data
-- and current code still work during the migration period.
CREATE TABLE IF NOT EXISTS session_initiatives (
  session_id    uuid NOT NULL REFERENCES sessions(id)    ON DELETE CASCADE,
  initiative_id uuid NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  position      int  NOT NULL DEFAULT 0,
  added_at      timestamptz NOT NULL DEFAULT now(),
  added_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (session_id, initiative_id)
);

ALTER TABLE session_initiatives ENABLE ROW LEVEL SECURITY;

-- Backfill junction rows from existing initiatives that already have a session_id
INSERT INTO session_initiatives (session_id, initiative_id, position, added_at)
SELECT session_id, id, COALESCE(position, 0), created_at
FROM   initiatives
WHERE  session_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_session_initiatives_session_id    ON session_initiatives(session_id);
CREATE INDEX IF NOT EXISTS idx_session_initiatives_initiative_id ON session_initiatives(initiative_id);

-- RLS: workspace members can read; admins can manage
CREATE POLICY "Workspace members can view session_initiatives"
  ON session_initiatives FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage session_initiatives"
  ON session_initiatives FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );

-- ── 3. votes.session_id ───────────────────────────────────────
-- Nullable for now; future votes will record which session they belong to.
ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);

-- ── 4. profiles — email + must_change_password ────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email               text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Backfill email from auth.users for existing profiles
UPDATE profiles p
SET    email = u.email
FROM   auth.users u
WHERE  p.id = u.id
  AND  p.email IS NULL;

-- Keep email in sync when a new user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- ── 5. workspaces — invite link fields ───────────────────────
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS invite_token  text UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_active boolean NOT NULL DEFAULT false;

-- Generate a unique token for every existing workspace so they're ready to use
-- PostgreSQL encode() supports 'base64' and 'hex', not 'base64url'.
-- We translate base64 → base64url: replace + with -, / with _, strip padding =
UPDATE workspaces
SET invite_token = replace(replace(replace(encode(gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE invite_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_invite_token ON workspaces(invite_token)
  WHERE invite_token IS NOT NULL;

-- ── 6. workspace_members.joined_via ───────────────────────────
-- 'invite'  = joined via invite link
-- 'direct'  = added directly by admin
-- 'creator' = created the workspace
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS joined_via text NOT NULL DEFAULT 'direct'
  CHECK (joined_via IN ('invite', 'direct', 'creator'));

-- Mark the workspace creator's membership row
UPDATE workspace_members wm
SET    joined_via = 'creator'
FROM   workspaces w
WHERE  wm.workspace_id = w.id
  AND  wm.user_id      = w.created_by
  AND  wm.joined_via   = 'direct';

-- ── 7. Rebuild initiative_scores view with new status column ──
DROP VIEW IF EXISTS initiative_scores;
CREATE VIEW initiative_scores AS
SELECT
  i.id,
  i.session_id,
  i.workspace_id,
  i.title,
  i.description,
  i.position,
  i.status,
  i.created_at,
  COALESCE(o.reach,       AVG(v.reach))       AS reach,
  COALESCE(o.impact,      AVG(v.impact))      AS impact,
  COALESCE(o.confidence,  AVG(v.confidence))  AS confidence,
  COALESCE(o.effort,      AVG(v.effort))      AS effort,
  CASE
    WHEN COALESCE(o.effort, AVG(v.effort)) > 0
    THEN ROUND(
      COALESCE(o.reach,       AVG(v.reach))      *
      COALESCE(o.impact,      AVG(v.impact))     *
      COALESCE(o.confidence,  AVG(v.confidence)) /
      COALESCE(o.effort,      AVG(v.effort))
    , 1)
    ELSE NULL
  END AS rice_score,
  COUNT(v.id)      AS vote_count,
  o.id IS NOT NULL AS has_override,
  o.note           AS override_note
FROM initiatives i
LEFT JOIN votes v     ON v.initiative_id = i.id
LEFT JOIN overrides o ON o.initiative_id = i.id
GROUP BY
  i.id, i.session_id, i.workspace_id,
  i.title, i.description, i.position, i.status, i.created_at,
  o.reach, o.impact, o.confidence, o.effort, o.id, o.note;

-- ── 8. Realtime ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE session_initiatives;
