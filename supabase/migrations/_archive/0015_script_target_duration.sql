-- Each idea now gets two script variants, one written to fit 15s and one to fit 30s,
-- so a generation's duration always matches content the script actually describes.
-- See src/app/api/scripts/generate/route.ts and src/lib/ai/prompts.ts (masterScriptPrompt).
alter table public.scripts add column target_duration_seconds integer check (target_duration_seconds in (15, 30));
