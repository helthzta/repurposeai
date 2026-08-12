-- Uploaded competitor / product / brand ad videos, per project.
create table public.source_videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('competitor', 'product', 'brand')),
  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index source_videos_project_id_idx on public.source_videos (project_id);

alter table public.source_videos enable row level security;

create policy "source_videos_all_own" on public.source_videos
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
