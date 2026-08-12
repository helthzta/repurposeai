-- Schedules the expire-subscriptions Edge Function (supabase/functions/expire-subscriptions) to
-- run every 6 hours. This is the only scheduled/background job in the project — see that
-- function's own comment for why verify_jwt stays on with the (non-secret) anon key rather than
-- needing the service-role key threaded through pg_cron.
--
-- The Authorization header below is literally NEXT_PUBLIC_SUPABASE_ANON_KEY (same value already
-- shipped in every browser bundle) — safe to commit as-is, it's not a secret. If this project's
-- anon key is ever rotated (rare), update it here too or this cron job starts getting 401s.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'expire-subscriptions',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://xxitlqjgmfqxesqiuouk.supabase.co/functions/v1/expire-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aXRscWpnbWZxeGVzcWl1b3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjE5NjUsImV4cCI6MjEwMDAzNzk2NX0.ENZr3A9T3pfYXfUjH4dyqjNqlU0VY02mEjk-3MqiU64'
    ),
    body := '{}'::jsonb
  );
  $$
);
