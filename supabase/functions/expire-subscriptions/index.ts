// Scheduled (pg_cron, see migration 0029) Supabase Edge Function — downgrades anyone whose
// 3-day grace window has lapsed with no renewal payment back to the 'free' plan. This is the
// enforcement half of the one-time-payment billing model (see dodo-webhook's own comment for the
// full picture): payment.succeeded stamps plan_grace_end, this sweep is what actually acts on it
// once it passes, since nothing else in this app runs on a schedule (no queue/cron infra
// otherwise — see architecture.md D-007).
//
// Auth: verify_jwt is left on (any validly-signed Supabase JWT, including the public anon key,
// gets past Supabase's own gate — the cron job sends the anon key, which is intentionally
// non-secret). That's sufficient here because the action itself is safe to trigger extra
// often or by anyone who merely holds the anon key: it only ever touches rows that are
// objectively already past their real plan_grace_end timestamp in the database, so there's no
// way to use this endpoint to downgrade someone early or do anything else. The elevated
// SERVICE_ROLE_KEY used for the actual update is Supabase's own auto-injected env var, not
// derived from the caller's auth at all.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.3";

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from("profiles")
    .update({ plan: "free" })
    .in("plan", ["starter", "pro"])
    .not("plan_grace_end", "is", null)
    .lt("plan_grace_end", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[expire-subscriptions] failed", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const count = data?.length ?? 0;
  if (count > 0) console.log(`[expire-subscriptions] downgraded ${count} account(s) to free`);

  return new Response(JSON.stringify({ downgraded: count }));
});
