-- Apply Desk 3.1: public job discovery data is private to the allow-listed user.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.public_job_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null check (provider in ('greenhouse', 'lever')),
  board_slug text not null,
  preferred_region text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, board_slug)
);

create table if not exists public.public_job_listings (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  source_id uuid references public.public_job_sources(id) on delete set null,
  company text not null default '',
  role text not null default '',
  location text not null default '',
  work_mode text not null default '',
  employment_type text not null default '',
  published_at timestamptz,
  deadline timestamptz,
  jd text not null default '',
  source text not null default '',
  official_url text not null default '',
  qualification_status text not null default 'review' check (qualification_status in ('eligible', 'review', 'excluded')),
  qualification_reason text not null default '',
  queue_kind text not null default 'radar' check (queue_kind in ('intern', 'hk', 'mainland', 'radar')),
  match_score smallint not null default 0 check (match_score between 0 and 100),
  status text not null default 'active' check (status in ('active', 'closed', 'error')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists public_job_listings_active_idx on public.public_job_listings(status, queue_kind, match_score desc, updated_at desc);

create table if not exists public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null default 'schedule',
  sources_checked integer not null default 0,
  listings_seen integer not null default 0,
  listings_added integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

create table if not exists public.jobsdb_source_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_url text not null,
  company text not null default '',
  role text not null default '',
  location text not null default '',
  jd text not null default '',
  source_page text not null default '',
  captured_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'imported', 'session_expired', 'rejected')),
  unique (user_id, canonical_url)
);

alter table public.public_job_sources enable row level security;
alter table public.public_job_listings enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.jobsdb_source_inbox enable row level security;

create policy "allowed users read job sources" on public.public_job_sources for select using (public.is_allowed_user());
create policy "allowed users manage job sources" on public.public_job_sources for all using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy "allowed users read public listings" on public.public_job_listings for select using (public.is_allowed_user());
create policy "allowed users read discovery runs" on public.discovery_runs for select using (public.is_allowed_user());
create policy "owner jobsdb inbox" on public.jobsdb_source_inbox for all using (public.is_allowed_user() and auth.uid() = user_id) with check (public.is_allowed_user() and auth.uid() = user_id);

-- This is a real official ATS board, used as the initial source catalogue entry.
insert into public.public_job_sources (name, provider, board_slug, preferred_region)
values ('Ekimetrics', 'lever', 'ekimetrics', 'Hong Kong')
on conflict (provider, board_slug) do nothing;

-- 08:00 Hong Kong time is 00:00 UTC. Runtime secrets stay in Supabase Vault,
-- never in this migration or in Git. Add `project_url` and `service_role_key`
-- through the Supabase dashboard before enabling this schedule.
select cron.schedule(
  'apply-desk-job-discovery-0800-hkt',
  '0 0 * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/job-discovery',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
    body := '{"trigger":"schedule"}'::jsonb
  );$$
);
