import { NextResponse } from "next/server";
import { ApiError } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { adminAdjustCredits } from "@/lib/credit-ledger";
import { GRACE_DAYS, PERIOD_DAYS } from "@/lib/pricing";

const PLANS = ["free", "starter", "pro", "custom"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Admin-only manual controls for testing and support: a signed credit adjustment and/or a plan
 * change. A paid plan set here gets the same 30-day period + grace window a real payment would
 * (see dodo-webhook), so billing_sweep() expires it like any other paid period.
 */
export const PATCH = withLogger(
  "admin.users.update",
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { admin: actor, db: admin } = await requireAdmin(request);
    const { id } = await params;
    const { creditsDelta, plan } = (await request.json().catch(() => ({}))) as {
      creditsDelta?: number;
      plan?: string;
    };

    if (creditsDelta === undefined && plan === undefined) {
      throw new ApiError(400, "Nothing to update — send creditsDelta and/or plan");
    }
    if (creditsDelta !== undefined && (!Number.isInteger(creditsDelta) || creditsDelta === 0)) {
      throw new ApiError(400, "creditsDelta must be a non-zero whole number");
    }
    if (plan !== undefined && !PLANS.includes(plan as (typeof PLANS)[number])) {
      throw new ApiError(400, `plan must be one of ${PLANS.join(", ")}`);
    }

    if (plan !== undefined) {
      const paid = plan === "starter" || plan === "pro";
      const now = Date.now();
      const { data: updated, error } = await admin
        .from("profiles")
        .update({
          plan,
          plan_period_end: paid ? new Date(now + PERIOD_DAYS * DAY_MS).toISOString() : null,
          plan_grace_end: paid
            ? new Date(now + (PERIOD_DAYS + GRACE_DAYS) * DAY_MS).toISOString()
            : null,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new ApiError(404, "User not found");
      await audit("user.plan_changed", {
        adminId: actor.id,
        targetType: "user",
        targetId: id,
        metadata: { plan },
      });
    }

    if (creditsDelta !== undefined) {
      try {
        await adminAdjustCredits(id, creditsDelta);
      } catch (error) {
        if (error instanceof Error && error.message === "insufficient_credits") {
          throw new ApiError(400, "That would take the balance below zero");
        }
        throw error;
      }
      await audit("user.credits_adjusted", {
        adminId: actor.id,
        targetType: "user",
        targetId: id,
        metadata: { creditsDelta },
      });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new ApiError(404, "User not found");

    return NextResponse.json({ profile });
  },
);
