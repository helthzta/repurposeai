-- Contact submissions for the Custom-plan "Contact Us" flow (/contact page) and any other
-- contact-us entry point. Public-facing — a visitor doesn't need to be signed in to submit, so
-- writes go through the service-role client from the API route (src/app/api/contact/route.ts),
-- same pattern as error_logs (see that migration's comment). user_id is best-effort only: set
-- when the submitter happens to be signed in, never required.
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  plan_interest text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'responded')),
  created_at timestamptz not null default now()
);

create index contact_submissions_created_at_idx on public.contact_submissions (created_at desc);

alter table public.contact_submissions enable row level security;

-- No select/insert policies: this table has no "owner" a visitor can be scoped to (submissions
-- may be anonymous), so every access path — the public POST insert and the admin GET/PATCH list —
-- goes through the service-role client (createAdminClient()), which bypasses RLS entirely, the
-- same as error_logs's writes. RLS is still enabled so a future anon/authenticated policy has to
-- be added deliberately rather than the table defaulting to open.
