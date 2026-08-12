-- Chaining (rendering >15s as two stitched clips) was removed once Seedance's native 30s
-- support made it redundant — see src/lib/generation.ts. 15s is the only active duration for
-- now; native 30s will be a provider-level change (VideoProvider.maxClipDurationSeconds), not
-- a return of these columns.
alter table public.generations
  drop column if exists chain_stage,
  drop column if exists chain_clip1_job_id;
