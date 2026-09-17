-- Verified public ATS boards; the collector still applies role, eligibility and duplicate gates.
insert into public.public_job_sources (name, provider, board_slug, preferred_region)
values
  ('Point72', 'greenhouse', 'point72', 'Hong Kong'),
  ('On', 'greenhouse', 'onrunning', 'Shanghai')
on conflict (provider, board_slug) do nothing;
