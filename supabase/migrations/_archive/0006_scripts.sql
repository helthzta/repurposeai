-- Repurposed script versions generated from an analysis (Step 3/4 in the doc).
create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  style text not null check (style in ('emotional', 'humorous', 'high_conversion', 'custom')),
  title text not null,
  hook text,
  body text not null,
  scene_descriptions text,
  emotional_direction text,
  cta text,
  estimated_duration text,
  language text not null default 'en',
  is_selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scripts_project_id_idx on public.scripts (project_id, created_at);

alter table public.scripts enable row level security;

create policy "scripts_all_own" on public.scripts
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
