import { NextResponse, type NextRequest } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { createDodoClient } from "@/lib/payments/dodo";
import { isPaidPlan, productId } from "@/lib/payments/plans";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Starts a one-time-payment Dodo checkout for the Starter/Pro plan (Custom is Contact-Us only,
 * D-023/D-024 — never reaches this route). Each billing cycle is its own fresh checkout, not a
 * Dodo Subscription — entitlement (profiles.plan/plan_period_end/plan_grace_end) is granted by
 * the dodo-webhook Edge Function on `payment.succeeded`, never trusted from this route or the
 * browser redirect (see that function's own comment on why).
 */
export const POST = withLogger(
  "billing.checkout",
  async (req: NextRequest) => {
    const { supabase, user } = await requireUser();
    const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };

    if (!isPaidPlan(plan)) throw new ApiError(400, 'plan must be "starter" or "pro"');
    if (!user.email) throw new ApiError(400, "Account has no email on file");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const dodo = createDodoClient();
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId(plan), quantity: 1 }],
      customer: {
        email: user.email,
        name: profile?.full_name || profile?.username || user.email,
      },
      // Metadata rides along onto the resulting Payment object (confirmed via the SDK's own
      // types) — this is how the webhook knows which of our users to credit. userId is what
      // actually matters; plan is included too but the webhook re-derives it from product_id
      // as the more robust source of truth (see that function).
      metadata: { userId: user.id, plan },
      return_url: `${SITE_URL}/checkout/success?plan=${plan}`,
      cancel_url: `${SITE_URL}/credits`,
    });

    if (!session.checkout_url) throw new ApiError(502, "Dodo did not return a checkout URL");

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
