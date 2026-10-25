import { NextResponse, type NextRequest } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { createDodoClient } from "@/lib/payments/dodo";
import type { BillingPlan } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Subscribes to a plan (billing_plans.id, e.g. "pro_yearly"). Custom is Contact-Us only.
 *
 * - No live subscription → a Dodo checkout session for that subscription product.
 * - Already subscribed → Dodo changePlan with prorated_immediately: Dodo charges or credits the
 *   unused time, and the dodo-webhook adjusts credits by the difference between the two plans'
 *   monthly allotments. A pending cancellation is lifted, since choosing a plan means staying.
 *
 * Entitlement itself is only ever granted by the webhook, never by this route or the redirect.
 */
export const POST = withLogger(
  "billing.checkout",
  async (req: NextRequest) => {
    const { user } = await requireUser();
    const { planId } = (await req.json().catch(() => ({}))) as { planId?: string };
    if (!planId) throw new ApiError(400, "planId is required");
    if (!user.email) throw new ApiError(400, "Account has no email on file");

    const admin = createAdminClient();
    const [{ data: plan }, { data: profile }] = await Promise.all([
      admin.from("billing_plans").select("*").eq("id", planId).eq("active", true).maybeSingle(),
      admin
        .from("profiles")
        .select("full_name, username, plan, dodo_subscription_id")
        .eq("id", user.id)
        .single(),
    ]);
    if (!plan) throw new ApiError(400, "Unknown plan");
    const billingPlan = plan as BillingPlan;
    if (!billingPlan.dodo_product_id) {
      throw new ApiError(503, "This plan isn't purchasable yet — run `npm run setup:dodo`");
    }

    const dodo = createDodoClient();

    if (profile?.dodo_subscription_id && profile.plan !== "free") {
      const { data: current } = await admin
        .from("subscriptions")
        .select("plan_id, status")
        .eq("id", profile.dodo_subscription_id)
        .maybeSingle();
      if (current && ["active", "on_hold"].includes(current.status)) {
        if (current.plan_id === billingPlan.id) {
          throw new ApiError(400, "You're already on this plan");
        }
        await dodo.subscriptions.changePlan(profile.dodo_subscription_id, {
          product_id: billingPlan.dodo_product_id,
          quantity: 1,
          proration_billing_mode: "prorated_immediately",
        });
        await dodo.subscriptions.update(profile.dodo_subscription_id, {
          cancel_at_next_billing_date: false,
        });
        return NextResponse.json({ changed: true });
      }
    }

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: billingPlan.dodo_product_id, quantity: 1 }],
      customer: {
        email: user.email,
        name: profile?.full_name || profile?.username || user.email,
      },
      // Rides along onto the Subscription and its Payments — how the webhook finds our user.
      metadata: { userId: user.id, planId: billingPlan.id },
      return_url: `${SITE_URL}/checkout/success?plan=${billingPlan.id}`,
      cancel_url: `${SITE_URL}/credits`,
    });
    if (!session.checkout_url) throw new ApiError(502, "Dodo did not return a checkout URL");

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
