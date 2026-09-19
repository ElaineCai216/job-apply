-- Keep abandoned ciphertext isolated from the next usable vault. The recovery
-- kit is encrypted client-side with a user-chosen recovery phrase.
create table if not exists public.sync_spaces (
  id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default false,
  recovery_ciphertext text,
  recovery_iv text,
  recovery_salt text,
  recovery_iterations integer,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.sync_spaces enable row level security;
create policy "owner sync spaces" on public.sync_spaces for all
using (public.is_allowed_user() and auth.uid() = user_id)
with check (public.is_allowed_user() and auth.uid() = user_id);

-- Existing opaque rows stay available as an inactive, legacy space. They are
-- deliberately not deleted and the new client never pulls them by default.
insert into public.sync_spaces (id, user_id, active)
select '00000000-0000-0000-0000-000000000001'::uuid, user_id, false
from public.encrypted_records
group by user_id
on conflict do nothing;

alter table public.encrypted_records add column if not exists sync_space_id uuid;
update public.encrypted_records
set sync_space_id = '00000000-0000-0000-0000-000000000001'::uuid
where sync_space_id is null;
alter table public.encrypted_records alter column sync_space_id set not null;
alter table public.encrypted_records drop constraint if exists encrypted_records_pkey;
alter table public.encrypted_records drop constraint if exists encrypted_records_user_id_id_key;
alter table public.encrypted_records add primary key (sync_space_id, id);
create index if not exists encrypted_records_owner_space_updated_idx
  on public.encrypted_records (user_id, sync_space_id, updated_at desc);

alter table public.encrypted_files add column if not exists sync_space_id uuid;
update public.encrypted_files
set sync_space_id = '00000000-0000-0000-0000-000000000001'::uuid
where sync_space_id is null;
alter table public.encrypted_files alter column sync_space_id set not null;
alter table public.encrypted_files drop constraint if exists encrypted_files_pkey;
alter table public.encrypted_files add primary key (sync_space_id, id);
create index if not exists encrypted_files_owner_space_updated_idx
  on public.encrypted_files (user_id, sync_space_id, updated_at desc);
