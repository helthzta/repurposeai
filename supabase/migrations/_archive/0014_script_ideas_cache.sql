-- Caches the un-persisted script ideas shown on the Ideas step so navigating back to it
-- (or reloading) doesn't burn another Gemini call and silently swap out different ideas.
-- See src/app/api/scripts/ideas/route.ts and src/components/workflow/IdeaStep.tsx.
alter table public.projects add column script_ideas jsonb;
