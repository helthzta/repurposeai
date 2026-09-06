-- Migration: Ensure signup bonus trigger is current and grants 50 free credits.
-- This migration re-creates the handle_new_user function to guarantee the trigger
-- is active in the live database. The baseline (0001) had this already, but this
-- ensures it's correct even if schema drift occurred.

-- Replace the trigger function to set bonus_credits to 50 free credits for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  bonus_credits constant integer := 50;
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8))
  )
  on conflict (id) do nothing; -- Idempotent: don't fail if profile already exists (e.g. Google OAuth race)

  -- Grant signup bonus credits via spend_credits (positive amount = credit grant)
  -- Only grants if the profile was actually inserted (new user)
  if found then
    perform public.spend_credits(new.id, bonus_credits, 'signup_bonus');
  end if;

  return new;
end;
$$;

-- Recreate the trigger in case it was dropped or not applied
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
