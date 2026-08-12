-- Per-script subtitle toggle (Language + Subtitles controls, ScriptStep.tsx). Presence/absence of
-- SUBTITLE lines in `body` is driven by this flag at generation time (masterScriptPrompt).
alter table public.scripts
  add column subtitles boolean not null default true;
