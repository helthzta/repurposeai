-- Brand profiles can now attach context images (product/packaging/mood shots) instead of
-- relying on a website scan for AI context. website_url/website_summary are left in place
-- (R-005 pattern) — still read by brandBrief() for any profile that already has one.
alter table brand_profiles
  add column context_image_paths text[] not null default '{}';
