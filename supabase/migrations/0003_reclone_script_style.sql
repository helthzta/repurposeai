-- Lets a script keep style 'reclone' (the shot-for-shot "Recreated" idea), so a later regenerate
-- rebuilds it as a reclone instead of silently turning it into a repurposed script.
-- Constraint name confirmed against the live project (pg_constraint), not inferred.
alter table public.scripts drop constraint scripts_style_check;
alter table public.scripts add constraint scripts_style_check
  check (style in ('emotional', 'humorous', 'high_conversion', 'custom', 'reclone'));
