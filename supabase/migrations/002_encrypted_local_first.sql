create table if not exists public.encrypted_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null,
  record_version bigint not null check (record_version > 0),
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (user_id, id)
);
alter table public.encrypted_records enable row level security;
create policy "owner encrypted records" on public.encrypted_records for all
using (public.is_allowed_user() and auth.uid() = user_id)
with check (public.is_allowed_user() and auth.uid() = user_id);
alter table public.encrypted_records replica identity full;
do $$ begin alter publication supabase_realtime add table public.encrypted_records; exception when duplicate_object then null; end $$;

create table if not exists public.encrypted_files (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid,
  storage_path text not null,
  cipher_metadata jsonb not null,
  version bigint not null check (version > 0),
  updated_at timestamptz not null default now()
);
alter table public.encrypted_files enable row level security;
create policy "owner encrypted files" on public.encrypted_files for all
using (public.is_allowed_user() and auth.uid() = user_id)
with check (public.is_allowed_user() and auth.uid() = user_id);
