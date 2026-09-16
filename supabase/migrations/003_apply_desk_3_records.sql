-- Apply Desk 3.0: encrypted records are shared by every local repository.
create index if not exists encrypted_records_owner_type_updated_idx
  on public.encrypted_records (user_id, record_type, updated_at desc);
