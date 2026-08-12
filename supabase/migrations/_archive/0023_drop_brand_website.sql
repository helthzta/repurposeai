-- Website scanning is fully removed (not just hidden) — superseded by brand context images
-- (0022, D-019/D-021). No RLS policy references these columns (checked 0017, 0019).
alter table public.brand_profiles
  drop column website_url,
  drop column website_summary;
