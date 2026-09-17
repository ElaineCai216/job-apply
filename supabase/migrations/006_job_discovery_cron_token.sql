-- Replace the broad service-role cron credential with a purpose-limited token.
select cron.unschedule('apply-desk-job-discovery-0800-hkt');

select cron.schedule(
  'apply-desk-job-discovery-0800-hkt',
  '0 0 * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/job-discovery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Apply-Desk-Cron', (select decrypted_secret from vault.decrypted_secrets where name = 'job_discovery_cron_token')
    ),
    body := '{"trigger":"schedule"}'::jsonb
  );$$
);
