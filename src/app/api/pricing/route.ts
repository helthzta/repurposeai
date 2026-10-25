import { NextResponse } from "next/server";
import { withLogger } from "@/lib/logger";
import { getPricing } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

/** Public: plans + per-video credit costs (both tables are public-read). */
export const GET = withLogger("pricing.get", async () => {
  const pricing = await getPricing(await createClient());
  // Strip the Dodo product ids — the browser never needs them.
  return NextResponse.json({
    ...pricing,
    plans: pricing.plans.map((p) => ({ ...p, dodo_product_id: null })),
  });
});
