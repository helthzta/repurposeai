-- Subtitles now default off — toggling them re-runs the full structured script generation
-- (writeScript -> masterScriptPrompt), which costs an AI call each time, so new scripts
-- shouldn't opt into that by default. See ScriptStep.tsx / scripts/generate/route.ts.
alter table public.scripts alter column subtitles set default false;
