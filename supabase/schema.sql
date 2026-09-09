-- CricketCam Live — realtime score bridge
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.

create table if not exists public.live_matches (
  match_code text primary key,
  score jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.live_matches enable row level security;

-- This app has no user accounts — both phones are trusted devices under the same
-- scorer's control, so access is scoped by knowledge of the match code, not by auth.
-- Do not reuse this permissive policy shape for data that needs real access control.
drop policy if exists "anyone can read live matches" on public.live_matches;
create policy "anyone can read live matches" on public.live_matches
  for select using (true);

drop policy if exists "anyone can upsert live matches" on public.live_matches;
create policy "anyone can upsert live matches" on public.live_matches
  for insert with check (true);

drop policy if exists "anyone can update live matches" on public.live_matches;
create policy "anyone can update live matches" on public.live_matches
  for update using (true) with check (true);

-- Add the table to Supabase's realtime publication so postgres_changes events fire.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_matches'
  ) then
    alter publication supabase_realtime add table public.live_matches;
  end if;
end $$;
