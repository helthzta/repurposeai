-- One row per video-generation attempt (initial generation, regenerate, variation).
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  script_id uuid not null references public.scripts (id) on delete cascade,
  provider text not null check (provider in ('seedance', 'higgsfield')),
  duration_seconds integer not null,
  aspect_ratio text not null check (aspect_ratio in ('9:16', '16:9', '1:1')),
  quality text not null check (quality in ('standard', 'high', 'ultra')),
  camera_style text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  prompt_used text,
  provider_job_id text,
  output_path text,
  output_url text,
  ai_insights jsonb,
  credits_charged integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index generations_project_id_idx on public.generations (project_id, created_at desc);

alter table public.generations enable row level security;

create policy "generations_all_own" on public.generations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
