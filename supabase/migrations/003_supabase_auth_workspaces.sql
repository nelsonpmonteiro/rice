-- ============================================================
-- RICE v2 — Supabase Auth + Workspaces
-- Substitui 002_users_groups.sql
-- Rodar no SQL Editor do Supabase após 001_init.sql
-- ============================================================

-- ── 1. Profiles (linked to auth.users via trigger) ───────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trigger: ao criar usuário em auth.users, insere profile automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── 2. Workspaces ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ── 3. Workspace Members ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at    timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ── 4. Alterar sessions: workspace_id + slug opcional ─────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE sessions ALTER COLUMN slug DROP NOT NULL;

-- ── 5. Alterar initiatives: workspace_id, session_id já nullable
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;

-- ── 6. Alterar votes: user_id substitui participant ───────────
ALTER TABLE votes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_initiative_id_participant_key;
ALTER TABLE votes ADD CONSTRAINT votes_initiative_id_user_id_key UNIQUE (initiative_id, user_id);

-- ── 7. RLS — Workspaces ───────────────────────────────────────
CREATE POLICY "Members can view their workspaces"
  ON workspaces FOR SELECT TO authenticated
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Workspace admins can update"
  ON workspaces FOR UPDATE TO authenticated
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Workspace admins can delete"
  ON workspaces FOR DELETE TO authenticated
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ── 8. RLS — Workspace Members ────────────────────────────────
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid()));

CREATE POLICY "Workspace admins can add members"
  ON workspace_members FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Workspace admins can update member roles"
  ON workspace_members FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Workspace admins or self can remove members"
  ON workspace_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ── 9. RLS — Sessions (substituir políticas públicas) ─────────
DROP POLICY IF EXISTS "Public read sessions" ON sessions;

CREATE POLICY "Workspace members can view sessions"
  ON sessions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace admins can create sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Workspace admins can update sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Workspace admins can delete sessions"
  ON sessions FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ── 10. RLS — Initiatives ─────────────────────────────────────
DROP POLICY IF EXISTS "Public read initiatives" ON initiatives;

CREATE POLICY "Workspace members can view initiatives"
  ON initiatives FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace admins can manage initiatives"
  ON initiatives FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ── 11. RLS — Votes ───────────────────────────────────────────
DROP POLICY IF EXISTS "Public read votes" ON votes;
DROP POLICY IF EXISTS "Anyone can vote" ON votes;
DROP POLICY IF EXISTS "Participant updates own vote" ON votes;

CREATE POLICY "Workspace members can view votes"
  ON votes FOR SELECT TO authenticated
  USING (
    initiative_id IN (
      SELECT i.id FROM initiatives i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own vote"
  ON votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── 12. RLS — Overrides ───────────────────────────────────────
DROP POLICY IF EXISTS "Public read overrides" ON overrides;

CREATE POLICY "Workspace members can view overrides"
  ON overrides FOR SELECT TO authenticated
  USING (
    initiative_id IN (
      SELECT i.id FROM initiatives i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage overrides"
  ON overrides FOR ALL TO authenticated
  USING (
    initiative_id IN (
      SELECT i.id FROM initiatives i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );

-- ── 13. Recriar view initiative_scores com workspace_id ───────
CREATE OR REPLACE VIEW initiative_scores AS
SELECT
  i.id,
  i.session_id,
  i.workspace_id,
  i.title,
  i.description,
  i.position,
  i.created_at,
  COALESCE(o.reach,       avg(v.reach))      AS reach,
  COALESCE(o.impact,      avg(v.impact))     AS impact,
  COALESCE(o.confidence,  avg(v.confidence)) AS confidence,
  COALESCE(o.effort,      avg(v.effort))     AS effort,
  CASE
    WHEN COALESCE(o.effort, avg(v.effort)) > 0
    THEN ROUND(
      COALESCE(o.reach,       avg(v.reach))      *
      COALESCE(o.impact,      avg(v.impact))     *
      COALESCE(o.confidence,  avg(v.confidence)) /
      COALESCE(o.effort,      avg(v.effort))
    , 1)
    ELSE NULL
  END AS rice_score,
  COUNT(v.id)      AS vote_count,
  o.id IS NOT NULL AS has_override,
  o.note           AS override_note
FROM initiatives i
LEFT JOIN votes v     ON v.initiative_id = i.id
LEFT JOIN overrides o ON o.initiative_id = i.id
GROUP BY i.id, i.session_id, i.workspace_id, i.title, i.description, i.position, i.created_at,
         o.reach, o.impact, o.confidence, o.effort, o.id, o.note;

-- ── 14. Índices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id      ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id          ON sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_workspace_id       ON initiatives(workspace_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_session_id         ON initiatives(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id                  ON votes(user_id);

-- ── 15. Realtime ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
