-- spend_credits() takes any user id and any signed amount and runs as SECURITY DEFINER, and it was
-- executable by anon/authenticated through /rest/v1/rpc/spend_credits — any visitor could grant
-- credits to any account. Only the service role may call it now (src/lib/credit-ledger.ts and the
-- dodo-webhook Edge Function); handle_new_user() still can, it runs as the function owner.
--
-- APPLY ONLY AFTER the app build that contains src/lib/credit-ledger.ts is deployed — older builds
-- call this RPC with the signed-in user's own client and would fail every generation.
revoke execute on function public.spend_credits(uuid, integer, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.spend_credits(uuid, integer, text, text, uuid) to service_role;

-- Trigger/event-trigger functions: never meant to be called over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
