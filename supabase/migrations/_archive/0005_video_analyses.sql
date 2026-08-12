-- Gemini's structured breakdown of the uploaded competitor ad (Step 2 in the doc).
create table public.video_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_video_id uuid not null references public.source_videos (id) on delete cascade,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  company text,
  business_category text,
  duration_seconds numeric,
  hook text,
  audience text,
  pain_point text,
  context text,
  emotional_trigger text,
  hero text,
  marketing_strategy text,
  offer text,
  cta text,
  narrative_structure text,
  tone_of_voice text,
  visual_style text,
  raw_response jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index video_analyses_project_id_idx on public.video_analyses (project_id, created_at desc);

alter table public.video_analyses enable row level security;

create policy "video_analyses_all_own" on public.video_analyses
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
