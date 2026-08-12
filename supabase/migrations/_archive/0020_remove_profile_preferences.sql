-- Theme/Language/Notifications were removed from Settings (now "Profile") entirely, not just
-- hidden — drop the columns backing them, same pattern as 0018's chaining-column removal.
alter table public.profiles
  drop column if exists theme,
  drop column if exists locale,
  drop column if exists notify_on_completion;
