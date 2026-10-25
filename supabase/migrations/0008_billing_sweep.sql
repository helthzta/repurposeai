-- 0008 · Scheduled billing sweep as a plain SQL function, replacing the expire-subscriptions Edge
-- Function.
--
-- The old cron job posted to the previous project's URL (xxitlqjgmfqxesqiuouk) and the function was
-- never deployed on this one, so nothing was being expired. Running the sweep in-database removes
-- the HTTP hop, the anon key in cron.job, and the deploy step.
--
-- What it does, hourly:
--   1. Yearly subscriptions: reset credits to the plan's monthly allotment every 30 days within the
--      paid year (monthly plans get theirs from the subscription.renewed webhook instead).
--   2. Lapsed plans: once plan_grace_end passes, move the account to 'free' and forfeit remaining
--      credits (they are a monthly allowance, not a purchase). plan_grace_end is the period end for
--      a cancelled subscription, or period end + 3 days while Dodo retries a failed renewal.

create or replace function public.billing_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  refilled integer := 0;
  expired integer := 0;
begin
  for r in
    select s.id, s.user_id, s.next_credit_refill_at, p.credits_per_month
    from public.subscriptions s
    join public.billing_plans p on p.id = s.plan_id
    join public.profiles pr on pr.id = s.user_id and pr.dodo_subscription_id = s.id
    where p.billing_interval = 'year'
      and s.status = 'active'
      and s.next_credit_refill_at <= now()
      and (s.current_period_end is null or s.next_credit_refill_at < s.current_period_end)
    for update of s
  loop
    perform public.reset_credits(r.user_id, r.credits_per_month, 'plan_monthly_refill', 'subscription', null);
    update public.subscriptions
      set next_credit_refill_at = r.next_credit_refill_at + interval '30 days'
      where id = r.id;
    refilled := refilled + 1;
  end loop;

  for r in
    select id from public.profiles
    where plan in ('starter', 'pro')
      and plan_grace_end is not null
      and plan_grace_end < now()
    for update
  loop
    update public.profiles
      set plan = 'free', plan_period_end = null, plan_grace_end = null
      where id = r.id;
    perform public.reset_credits(r.id, 0, 'plan_expired');
    expired := expired + 1;
  end loop;

  return jsonb_build_object('refilled', refilled, 'expired', expired);
end;
$$;

revoke execute on function public.billing_sweep() from public, anon, authenticated;
grant execute on function public.billing_sweep() to service_role;

-- Swap the broken HTTP job for a direct call. cron.unschedule errors on a missing job name, so guard it.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-subscriptions') then
    perform cron.unschedule('expire-subscriptions');
  end if;
  if exists (select 1 from cron.job where jobname = 'billing-sweep') then
    perform cron.unschedule('billing-sweep');
  end if;
end;
$$;

select cron.schedule('billing-sweep', '7 * * * *', 'select public.billing_sweep()');
