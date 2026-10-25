// Pure billing rules for dodo-webhook — no Deno or Supabase imports, so scripts/test-billing.ts can
// run the exact same code under Node.
//
// Policy (decision-log D-032):
// - Credits reset (not top up) to the plan's monthly allotment once per billing period; yearly
//   plans also reset every 30 days in between (billing_sweep(), migration 0008).
// - Cancel = at period end. Access and remaining credits last until the paid period ends, then the
//   sweep moves the account to 'free' and forfeits the credits. No refunds, no proration on cancel.
// - A failed renewal (on_hold) keeps access for GRACE_DAYS past period end while Dodo retries.
// - Plan change mid-period: Dodo charges/credits the prorated difference; we add (or remove) only
//   the difference in monthly credits, never a fresh full allotment — so switching back and forth
//   can't mint credits.

export const GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PaidPlan = "starter" | "pro";

export interface PlanRow {
  id: string;
  plan: PaidPlan;
  billing_interval: "month" | "year";
  credits_per_month: number;
}

/** The subset of Dodo's Subscription object these rules read. */
export interface SubscriptionSnapshot {
  status: string;
  previous_billing_date: string;
  next_billing_date: string;
  cancel_at_next_billing_date: boolean;
}

/** What we already stored for this subscription, if anything. */
export interface StoredSubscription {
  plan_id: string;
  credited_period_start: string | null;
}

export interface Entitlement {
  plan: PaidPlan;
  plan_period_end: string;
  plan_grace_end: string;
}

/** Profile entitlement implied by a subscription's current state; null = leave the profile alone. */
export function entitlementFor(sub: SubscriptionSnapshot, plan: PlanRow): Entitlement | null {
  const periodEnd = new Date(sub.next_billing_date);
  if (Number.isNaN(periodEnd.getTime())) return null;

  switch (sub.status) {
    case "active":
    case "on_hold": {
      // Scheduled to cancel → no grace; otherwise grace covers Dodo's renewal retries.
      const grace = sub.cancel_at_next_billing_date
        ? periodEnd
        : new Date(periodEnd.getTime() + GRACE_DAYS * DAY_MS);
      return {
        plan: plan.plan,
        plan_period_end: periodEnd.toISOString(),
        plan_grace_end: grace.toISOString(),
      };
    }
    case "cancelled":
    case "expired":
      // Keep what was paid for, no grace. If that date already passed, the next sweep downgrades.
      return {
        plan: plan.plan,
        plan_period_end: periodEnd.toISOString(),
        plan_grace_end: periodEnd.toISOString(),
      };
    default:
      // pending / failed (first payment never went through): nothing was granted, nothing to change.
      return null;
  }
}

export type CreditAction =
  | { kind: "reset"; target: number; periodStart: string }
  | { kind: "delta"; amount: number; periodStart: string }
  | null;

/** Credit change a subscription event implies. */
export function creditActionFor(
  eventType: string,
  sub: SubscriptionSnapshot,
  plan: PlanRow,
  stored: StoredSubscription | null,
  storedPlan: PlanRow | null,
): CreditAction {
  if (sub.status !== "active") return null;
  const periodStart = sub.previous_billing_date;

  if (
    eventType === "subscription.plan_changed" &&
    stored &&
    storedPlan &&
    storedPlan.id !== plan.id
  ) {
    const amount = plan.credits_per_month - storedPlan.credits_per_month;
    return amount === 0 ? null : { kind: "delta", amount, periodStart };
  }

  if (eventType === "subscription.active" || eventType === "subscription.renewed") {
    // Dodo can send both for the same period — only the first one grants.
    if (stored?.credited_period_start && sameInstant(stored.credited_period_start, periodStart)) {
      return null;
    }
    return { kind: "reset", target: plan.credits_per_month, periodStart };
  }

  return null;
}

/** Yearly plans refill monthly between renewals; monthly plans don't need a scheduled refill. */
export function nextRefillAt(plan: PlanRow, periodStart: string): string | null {
  if (plan.billing_interval !== "year") return null;
  return new Date(new Date(periodStart).getTime() + 30 * DAY_MS).toISOString();
}

function sameInstant(a: string, b: string) {
  return new Date(a).getTime() === new Date(b).getTime();
}
