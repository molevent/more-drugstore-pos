-- Migration: Schedule daily product sync to FlowAccount
-- This uses pg_cron + pg_net to call the Edge Function every day at 23:55 (Thailand time = 16:55 UTC)
-- Run this in Supabase Dashboard SQL Editor

-- Enable pg_cron and pg_net extensions if not already enabled
-- (These are already available in Supabase but may need to be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily sync at 23:55 Thailand time (16:55 UTC)
-- Calls the sync-products-to-fa Edge Function
SELECT cron.schedule(
  'daily-product-sync-to-fa',       -- job name
  '55 16 * * *',                     -- cron expression: 16:55 UTC = 23:55 ICT
  $$
  SELECT net.http_post(
    url := 'https://tqbonqjabeavlwjvrpqx.supabase.co/functions/v1/sync-products-to-fa',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxYm9ucWphYmVhdmx3anZycHF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA3MjAxMiwiZXhwIjoyMDg0NjQ4MDEyfQ.service_role_key_here'
    ),
    body := '{"env": "sandbox"}'::jsonb
  );
  $$
);

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove this job if needed:
-- SELECT cron.unschedule('daily-product-sync-to-fa');

-- To run the job manually for testing:
-- SELECT cron.alter_job(
--   job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-product-sync-to-fa'),
--   schedule := '* * * * *'  -- run every minute temporarily
-- );

-- IMPORTANT: Replace 'service_role_key_here' with your actual Supabase service_role key
-- You can find it in: Supabase Dashboard > Settings > API > service_role key
