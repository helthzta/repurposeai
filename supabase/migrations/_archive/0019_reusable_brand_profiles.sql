-- Brand details move from "one brand_profiles row per project" to a reusable,
-- user-owned entity: a user can have multiple named brand profiles and pick
-- one per project, instead of re-entering brand details every time.

alter table public.brand_profiles
  add column user_id uuid references public.profiles (id) on delete cascade,
  add column label text,
  add column is_default boolean not null default false;

-- Backfill: every existing row was 1:1 with a project — inherit that project's
-- owner and keep the row as its own profile (labeled after the brand name, or a
-- generic label if none was set) so no existing brand data is lost.
update public.brand_profiles bp
set user_id = p.user_id,
    label = coalesce(bp.brand_name, 'Brand Profile')
from public.projects p
where p.id = bp.project_id;

-- Of a user's inherited profiles, mark their most recently created one default —
-- only matters for users who had more than one project (and so more than one
-- brand_profiles row) before this migration.
update public.brand_profiles bp
set is_default = true
where bp.id in (
  select distinct on (user_id) id
  from public.brand_profiles
  where user_id is not null
  order by user_id, created_at desc
);

alter table public.brand_profiles
  alter column user_id set not null,
  alter column label set not null;

-- Projects now reference which of the user's brand profiles they use, rather
-- than owning one 1:1.
alter table public.projects
  add column brand_profile_id uuid references public.brand_profiles (id) on delete set null;

update public.projects p
set brand_profile_id = bp.id
from public.brand_profiles bp
where bp.project_id = p.id;

-- RLS: brand_profiles are now scoped directly by user_id instead of joining through projects.
-- Must drop the old policy before dropping project_id — it's defined in terms of that column.
drop policy if exists "brand_profiles_all_own" on public.brand_profiles;
create policy "brand_profiles_all_own" on public.brand_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.brand_profiles
  drop constraint if exists brand_profiles_project_id_key,
  drop column project_id;

create index brand_profiles_user_id_idx on public.brand_profiles (user_id, created_at desc);

-- ponytail: "only one default profile per user" is enforced in application code
-- (src/app/api/brand-profiles/[id]/route.ts unsets any other default before setting
-- a new one), not a DB constraint/trigger — add a partial unique index on
-- (user_id) where is_default if that ever proves too weak.
