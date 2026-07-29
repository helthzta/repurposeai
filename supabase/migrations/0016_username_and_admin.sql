-- Adds username-based identity (signup now collects a username alongside email)
-- and an is_admin flag for the new admin dashboard. Not applied automatically —
-- apply manually, same as prior migrations (see SETUP.md §2).

alter table public.profiles
  add column username text,
  add column is_admin boolean not null default false;

-- Existing rows (if any) get a placeholder derived from email so the unique
-- constraint below can be added without failing on pre-existing data.
update public.profiles
set username = split_part(email, '@', 1) || '_' || substr(id::text, 1, 8)
where username is null;

alter table public.profiles
  alter column username set not null;

create unique index profiles_username_key on public.profiles (username);

-- Rebuild handle_new_user to also persist the username collected at signup
-- (passed as auth.signUp's options.data.username — see login-client.tsx).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  bonus_credits constant integer := 100;
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8))
  );

  perform public.spend_credits(new.id, bonus_credits, 'signup_bonus');

  return new;
end;
$$;

-- To make yourself an admin after applying this migration, run:
--   update public.profiles set is_admin = true where email = 'you@example.com';
