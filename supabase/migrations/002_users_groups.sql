-- ============================================================
-- RICE — Users, Groups & Auth Sessions
-- Run AFTER 001_init.sql
-- ============================================================

-- Groups (workstations)
create table groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  created_at timestamptz default now()
);

-- Users
create table users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  password_hash text not null,
  group_id      uuid references groups(id),
  role          text not null default 'member',
  created_at    timestamptz default now(),
  constraint users_role_check check (role in ('admin', 'member'))
);

-- Auth session tokens
create table user_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token      text unique not null,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz default now()
);

-- Link sessions (prioritization rounds) to a group
alter table sessions add column group_id uuid references groups(id);

-- ── RLS ──────────────────────────────────────────────────────
alter table groups        enable row level security;
alter table users         enable row level security;
alter table user_sessions enable row level security;

-- Groups and users: public read (names/slugs needed in UI)
create policy "Public read groups" on groups for select using (true);
create policy "Public read users"  on users  for select using (true);
-- user_sessions and all writes use service role key only

-- ── Indexes ──────────────────────────────────────────────────
create index on user_sessions (token);
create index on user_sessions (expires_at);
create index on sessions (group_id);

-- ============================================================
-- To create your first admin user, run in Supabase SQL Editor:
--
-- INSERT INTO groups (name, slug) VALUES ('Minha Equipe', 'minha-equipe');
--
-- INSERT INTO users (username, password_hash, group_id, role)
-- SELECT 'admin',
--        crypt('suasenha', gen_salt('bf')),
--        id,
--        'admin'
-- FROM groups WHERE slug = 'minha-equipe';
--
-- NOTE: crypt() requires pgcrypto extension:
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
-- Alternatively, use the /api/admin/seed endpoint (see README)
-- or hash the password externally with bcryptjs and insert directly.
-- ============================================================
