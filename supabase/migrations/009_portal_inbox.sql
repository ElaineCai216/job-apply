-- Public job facts only. Personal application data remains encrypted_records.
alter table public.collector_devices add column if not exists portal text not null default 'jobsdb' check (portal in ('jobsdb','offertoday','ctgoodjobs','boss'));
create table if not exists public.portal_job_inbox (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  portal text not null check (portal in ('jobsdb','offertoday','ctgoodjobs','boss')),
  canonical_url text not null, company text, role text not null, location text, jd text, source_page text,
  captured_at timestamptz not null default now(), status text not null default 'pending',
  unique(user_id, portal, canonical_url)
);
alter table public.portal_job_inbox enable row level security;
create policy "owner portal inbox" on public.portal_job_inbox for all using (public.is_allowed_user() and auth.uid()=user_id) with check (public.is_allowed_user() and auth.uid()=user_id);
insert into public.portal_job_inbox(user_id,portal,canonical_url,company,role,location,jd,source_page,captured_at,status)
select user_id,'jobsdb',canonical_url,company,role,location,jd,source_page,captured_at,status from public.jobsdb_source_inbox
on conflict (user_id,portal,canonical_url) do nothing;
