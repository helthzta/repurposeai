-- Supports rendering durations beyond a provider's single-call cap (e.g. Seedance's 15s)
-- as two chained clips, stitched into one delivered video. See src/lib/generation.ts.
alter table public.generations
  add column chain_stage text check (chain_stage in ('clip1', 'clip2')),
  add column chain_clip1_job_id text;
