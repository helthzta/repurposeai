-- Buckets used by the app. Paths are always "{user_id}/{project_id}/{filename}",
-- so ownership can be checked from the first path segment alone.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('source-videos', 'source-videos', false, 524288000),
  ('generated-videos', 'generated-videos', false, 524288000),
  ('brand-logos', 'brand-logos', true, 10485760)
on conflict (id) do nothing;

create policy "source_videos_owner_rw" on storage.objects
  for all using (bucket_id = 'source-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'source-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "generated_videos_owner_rw" on storage.objects
  for all using (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "brand_logos_public_read" on storage.objects
  for select using (bucket_id = 'brand-logos');

create policy "brand_logos_owner_write" on storage.objects
  for insert with check (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "brand_logos_owner_update_delete" on storage.objects
  for update using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "brand_logos_owner_delete" on storage.objects
  for delete using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);
