-- Renames the "enterprise" plan value to "custom" (Custom plan replaces Enterprise entirely —
-- see the payment-plan update spec). Existing rows are migrated, not just the constraint, so no
-- profile is left holding a plan value the app no longer recognizes.
update public.profiles set plan = 'custom' where plan = 'enterprise';

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('starter', 'pro', 'custom'));
