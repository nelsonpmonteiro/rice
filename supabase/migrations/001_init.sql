-- ============================================================
-- RICE Prioritization Tool — Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Sessions: each prioritization round
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,         -- URL-friendly identifier, e.g. "q2-2025"
  name        text not null,
  description text,
  status      text not null default 'open', -- 'open' | 'closed'
  voting_open boolean not null default false,
  created_at  timestamptz default now()
);

-- Initiatives within a session
create table initiatives (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade,
  title       text not null,
  description text,
  position    int default 0,               -- display order
  created_at  timestamptz default now()
);

-- Participant votes per initiative
create table votes (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid references initiatives(id) on delete cascade,
  participant   text not null,             -- anonymous display name chosen on entry
  reach         numeric not null check (reach >= 0),
  impact        numeric not null check (impact in (0.25, 0.5, 1, 2, 3)),
  confidence    numeric not null check (confidence in (0.5, 0.8, 1.0)),
  effort        numeric not null check (effort > 0),
  created_at    timestamptz default now(),
  unique(initiative_id, participant)       -- one vote per participant per initiative
);

-- Admin score overrides (replaces computed average)
create table overrides (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid references initiatives(id) on delete cascade unique,
  reach         numeric,
  impact        numeric,
  confidence    numeric,
  effort        numeric,
  note          text,
  updated_at    timestamptz default now()
);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime for live dashboard updates
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table overrides;
alter publication supabase_realtime add table initiatives;
alter publication supabase_realtime add table sessions;

-- ── Row Level Security ────────────────────────────────────────
-- Public: read sessions, initiatives; insert/update own votes
alter table sessions    enable row level security;
alter table initiatives enable row level security;
alter table votes       enable row level security;
alter table overrides   enable row level security;

-- Sessions: public read
create policy "Public read sessions"    on sessions    for select using (true);
create policy "Public read initiatives" on initiatives for select using (true);
create policy "Public read votes"       on votes       for select using (true);
create policy "Public read overrides"   on overrides   for select using (true);

-- Votes: anyone can insert/update (participant name is their identity)
create policy "Anyone can vote" on votes
  for insert with check (true);

create policy "Participant updates own vote" on votes
  for update using (true);

-- Initiatives + overrides: managed via service role key (admin API route)
-- No additional public insert policy needed — admin calls use service_role

-- ── Helper view: computed RICE scores ────────────────────────
create or replace view initiative_scores as
select
  i.id,
  i.session_id,
  i.title,
  i.description,
  i.position,
  -- use override if present, otherwise average of votes
  coalesce(o.reach,      avg(v.reach))      as reach,
  coalesce(o.impact,     avg(v.impact))     as impact,
  coalesce(o.confidence, avg(v.confidence)) as confidence,
  coalesce(o.effort,     avg(v.effort))     as effort,
  -- RICE score
  case
    when coalesce(o.effort, avg(v.effort)) > 0
    then round(
      coalesce(o.reach, avg(v.reach)) *
      coalesce(o.impact, avg(v.impact)) *
      coalesce(o.confidence, avg(v.confidence)) /
      coalesce(o.effort, avg(v.effort))
    , 1)
    else 0
  end as rice_score,
  count(v.id) as vote_count,
  o.id is not null as has_override,
  o.note as override_note
from initiatives i
left join votes v on v.initiative_id = i.id
left join overrides o on o.initiative_id = i.id
group by i.id, i.session_id, i.title, i.description, i.position,
         o.reach, o.impact, o.confidence, o.effort, o.id, o.note;
