-- Lets a project's brand info include a website to scan for context, fed into
-- script-writing prompts alongside the existing brand fields. Not applied
-- automatically — apply manually, same as prior migrations (see SETUP.md §2).

alter table public.brand_profiles
  add column website_url text,
  add column website_summary text;
