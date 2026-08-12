-- Credit ledger + the function that atomically spends/refunds credits.
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index credit_transactions_user_id_idx on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

create policy "credit_transactions_select_own" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- amount is signed: negative to spend, positive to grant/refund. Raises if it
-- would take the balance below zero, so concurrent generations can't overdraw.
create function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
  set credits_balance = credits_balance + p_amount,
      updated_at = now()
  where id = p_user_id
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'profile % not found', p_user_id;
  end if;

  if new_balance < 0 then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_transactions (user_id, amount, reason, reference_type, reference_id, balance_after)
  values (p_user_id, p_amount, p_reason, p_reference_type, p_reference_id, new_balance);

  return new_balance;
end;
$$;

-- Creates the profile + signup bonus ledger entry for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  bonus_credits constant integer := 100;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  perform public.spend_credits(new.id, bonus_credits, 'signup_bonus');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
