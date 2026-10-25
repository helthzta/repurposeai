-- 0010 · generations becomes read-only for users. APPLY ONLY AFTER the app build that writes
-- generations with the service-role client (src/lib/generation.ts) is live — older builds insert
-- generations with the user's own session and would fail every new generation.
--
-- Why: generations_all_own let a user update their own rows, and failGeneration() refunds the row's
-- credits_charged. A user could set a failed row back to 'processing' with a huge credits_charged
-- and poll it to mint credits. Users now only read; every write goes through the server.
-- Deleting a project still removes its generations (FK on delete cascade runs as table owner).

drop policy if exists generations_all_own on public.generations;

create policy generations_select_own on public.generations
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = generations.project_id and p.user_id = auth.uid()
    )
  );

revoke insert, update, delete, truncate on public.generations from anon, authenticated;
