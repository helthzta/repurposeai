-- 0009 · DESTRUCTIVE — apply only after the app build without is_admin / 1:1 / 480p is live.
--
-- 1. Drops profiles.is_admin. Admins are separate accounts now (0007). Checked against the live
--    project before writing this: no RLS policy, function, trigger or column grant references
--    is_admin (it was only ever read by app code), so no policy needs to be recreated (R-023).
--    The one row with is_admin = true loses nothing else — it stays a normal user account.
-- 2. Removes '1:1' from generations.aspect_ratio. Zero rows use it (checked live).
-- 3. Keeps 'standard' (480p) in generations.quality on purpose: 3 historical rows use it, and
--    rewriting them would falsify what was rendered. The app no longer offers it, and credit_rates
--    has no 'standard' row, so a new 480p generation can't be priced or created.
-- 4. spend_credits lock-down (0004) — included again so this file is the one to apply; harmless
--    if 0004 already ran.

alter table public.profiles drop column is_admin;

alter table public.generations drop constraint generations_aspect_ratio_check;
alter table public.generations
  add constraint generations_aspect_ratio_check check (aspect_ratio in ('9:16', '16:9'));

revoke execute on function public.spend_credits(uuid, integer, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.spend_credits(uuid, integer, text, text, uuid) to service_role;
