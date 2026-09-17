-- Safari receives a revocable collector token, never a JobsDB credential.
create table if not exists public.collector_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Safari on Mac',
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null default now() + interval '180 days'
);
alter table public.collector_devices enable row level security;
create policy "owner collector devices" on public.collector_devices for all using (public.is_allowed_user() and auth.uid() = user_id) with check (public.is_allowed_user() and auth.uid() = user_id);
