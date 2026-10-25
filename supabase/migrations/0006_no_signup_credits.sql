-- 0006 · New users start with 0 credits.
--
-- Replaces handle_new_user() without the 50-credit signup_bonus grant (0002). profiles.credits_balance
-- already defaults to 0, so nothing else grants credits on sign-up. Existing users keep whatever
-- balance they already have — this only affects accounts created after it is applied.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8))
  )
  on conflict (id) do nothing; -- Google OAuth can race the trigger
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
