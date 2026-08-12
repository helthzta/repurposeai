-- Reworks video_analyses around "why did this go viral" instead of generic ad breakdown
-- (see context/decision-log.md). tone_of_voice and visual_style are kept — script
-- generation now auto-derives tone from tone_of_voice, and generation.ts's "Original"
-- camera style pulls visual_style — both are load-bearing, not just descriptive anymore.
alter table public.video_analyses
  rename column business_category to company_does;

alter table public.video_analyses
  add column viral_factor text,
  add column relief text,
  add column language text,
  add column video_metrics text;

alter table public.video_analyses
  drop column marketing_strategy,
  drop column offer,
  drop column cta,
  drop column narrative_structure;
