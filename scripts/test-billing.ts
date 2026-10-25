/**
 * Self-check for the money paths that don't need a network: plan price math (monthly, yearly −20%),
 * per-video credit math, and the dodo-webhook rules for entitlement, credit resets, plan changes
 * and cancellation. Run: `npx tsx scripts/test-billing.ts` — exits non-zero on the first failure.
 */
import assert from "node:assert/strict";
import {
  creditActionFor,
  entitlementFor,
  nextRefillAt,
  type PlanRow,
  type SubscriptionSnapshot,
} from "../supabase/functions/_shared/billing";
import {
  monthlyPriceCents,
  rateFor,
  videosPerMonth,
  yearlySavingPercent,
  type BillingPlan,
  type CreditRate,
} from "../src/lib/pricing";

// Mirrors the rows seeded by migration 0005.
const plans: BillingPlan[] = [
  ["starter_monthly", "starter", "month", 1900, 70],
  ["starter_yearly", "starter", "year", 18000, 70],
  ["pro_monthly", "pro", "month", 3900, 168],
  ["pro_yearly", "pro", "year", 37200, 168],
].map(([id, plan, billing_interval, price_cents, credits_per_month], i) => ({
  id,
  plan,
  billing_interval,
  name: plan === "starter" ? "Start" : "Pro",
  price_cents,
  credits_per_month,
  dodo_product_id: null,
  active: true,
  sort_order: i,
})) as BillingPlan[];
const rates: CreditRate[] = [
  { duration_seconds: 15, quality: "high", credits: 5, est_cost_usd: 0.64 },
  { duration_seconds: 15, quality: "ultra", credits: 35, est_cost_usd: 5.63 },
  { duration_seconds: 30, quality: "high", credits: 40, est_cost_usd: 6.94 },
  { duration_seconds: 30, quality: "ultra", credits: 42, est_cost_usd: 6.94 },
];
const plan = (id: string) => plans.find((p) => p.id === id)!;
const rate = (d: number, q: "high" | "ultra") => rateFor(rates, d, q)!;
let checks = 0;
const check = (name: string, fn: () => void) => {
  fn();
  checks++;
  console.log(`  ✓ ${name}`);
};

console.log("Prices");
check("monthly list prices are $19 and $39", () => {
  assert.equal(monthlyPriceCents(plan("starter_monthly")), 1900);
  assert.equal(monthlyPriceCents(plan("pro_monthly")), 3900);
});
check("yearly is 20% off rounded to whole dollars: $15/mo ($180) and $31/mo ($372)", () => {
  assert.equal(monthlyPriceCents(plan("starter_yearly")), 1500);
  assert.equal(monthlyPriceCents(plan("pro_yearly")), 3100);
  assert.equal(Math.round((1900 * 12 * 0.8) / 1200) * 1200, 18000);
  assert.equal(Math.round((3900 * 12 * 0.8) / 1200) * 1200, 37200);
});
check("advertised yearly saving is ≥ 20% (21% after rounding)", () => {
  assert.equal(yearlySavingPercent(plan("starter_monthly"), plan("starter_yearly")), 21);
  assert.equal(yearlySavingPercent(plan("pro_monthly"), plan("pro_yearly")), 21);
});

console.log("Credits per video (sheet column C) and videos per month (column H)");
check("Start: 70c = 14 × 15s 720p, 2 × 15s 1080p", () => {
  assert.equal(videosPerMonth(plan("starter_monthly"), rate(15, "high")), 14);
  assert.equal(videosPerMonth(plan("starter_monthly"), rate(15, "ultra")), 2);
});
check("Pro: 168c = 4 × 30s 720p (40c), 4 × 30s 1080p (42c) — not 3", () => {
  assert.equal(videosPerMonth(plan("pro_monthly"), rate(30, "high")), 4);
  assert.equal(videosPerMonth(plan("pro_monthly"), rate(30, "ultra")), 4);
});
check("yearly plans get the same monthly credit math", () => {
  for (const r of rates) {
    assert.equal(
      videosPerMonth(plan("starter_yearly"), r),
      videosPerMonth(plan("starter_monthly"), r),
    );
    assert.equal(videosPerMonth(plan("pro_yearly"), r), videosPerMonth(plan("pro_monthly"), r));
  }
});
check("480p (standard) has no rate, so it can't be priced or generated", () => {
  assert.equal(rateFor(rates, 15, "standard" as never), null);
});

console.log("Webhook rules");
const row = (id: string): PlanRow => {
  const p = plan(id);
  return {
    id: p.id,
    plan: p.plan,
    billing_interval: p.billing_interval,
    credits_per_month: p.credits_per_month,
  };
};
const sub = (over: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot => ({
  status: "active",
  previous_billing_date: "2026-10-01T00:00:00.000Z",
  next_billing_date: "2026-11-01T00:00:00.000Z",
  cancel_at_next_billing_date: false,
  ...over,
});

check("subscription.active grants the monthly allotment (reset, not top-up)", () => {
  assert.deepEqual(
    creditActionFor("subscription.active", sub(), row("starter_monthly"), null, null),
    {
      kind: "reset",
      target: 70,
      periodStart: "2026-10-01T00:00:00.000Z",
    },
  );
});
check("active + renewed for the same period grant only once", () => {
  const stored = { plan_id: "starter_monthly", credited_period_start: "2026-10-01T00:00:00+00:00" };
  assert.equal(
    creditActionFor("subscription.renewed", sub(), row("starter_monthly"), stored, null),
    null,
  );
});
check("renewal for the next period resets again", () => {
  const stored = { plan_id: "pro_monthly", credited_period_start: "2026-10-01T00:00:00Z" };
  const next = sub({
    previous_billing_date: "2026-11-01T00:00:00Z",
    next_billing_date: "2026-12-01T00:00:00Z",
  });
  assert.equal(
    creditActionFor("subscription.renewed", next, row("pro_monthly"), stored, null)?.kind,
    "reset",
  );
});
check("upgrade Start → Pro adds only the difference (+98), never a fresh 168", () => {
  const stored = { plan_id: "starter_monthly", credited_period_start: "2026-10-01T00:00:00Z" };
  const action = creditActionFor(
    "subscription.plan_changed",
    sub(),
    row("pro_monthly"),
    stored,
    row("starter_monthly"),
  );
  assert.deepEqual(action, { kind: "delta", amount: 98, periodStart: "2026-10-01T00:00:00.000Z" });
});
check("downgrade Pro → Start removes the difference (−98)", () => {
  const stored = { plan_id: "pro_monthly", credited_period_start: "2026-10-01T00:00:00Z" };
  const action = creditActionFor(
    "subscription.plan_changed",
    sub(),
    row("starter_monthly"),
    stored,
    row("pro_monthly"),
  );
  assert.equal(action?.kind === "delta" && action.amount, -98);
});
check("monthly → yearly on the same tier changes no credits", () => {
  const stored = { plan_id: "pro_monthly", credited_period_start: "2026-10-01T00:00:00Z" };
  assert.equal(
    creditActionFor(
      "subscription.plan_changed",
      sub(),
      row("pro_yearly"),
      stored,
      row("pro_monthly"),
    ),
    null,
  );
});
check("an on_hold / cancelled event never grants credits", () => {
  for (const status of ["on_hold", "cancelled", "failed", "expired"]) {
    assert.equal(
      creditActionFor("subscription.renewed", sub({ status }), row("pro_monthly"), null, null),
      null,
    );
  }
});
check("active subscription: access to period end + 3-day retry grace", () => {
  assert.deepEqual(entitlementFor(sub(), row("pro_monthly")), {
    plan: "pro",
    plan_period_end: "2026-11-01T00:00:00.000Z",
    plan_grace_end: "2026-11-04T00:00:00.000Z",
  });
});
check("cancel at period end: access until period end, no grace", () => {
  const e = entitlementFor(sub({ cancel_at_next_billing_date: true }), row("pro_yearly"));
  assert.equal(e?.plan_grace_end, "2026-11-01T00:00:00.000Z");
  assert.equal(e?.plan, "pro");
});
check("cancelled / expired: keep what was paid for, then the sweep downgrades", () => {
  for (const status of ["cancelled", "expired"]) {
    const e = entitlementFor(sub({ status }), row("starter_monthly"));
    assert.equal(e?.plan_period_end, e?.plan_grace_end);
  }
});
check("failed first payment / pending: no entitlement change", () => {
  assert.equal(entitlementFor(sub({ status: "failed" }), row("pro_monthly")), null);
  assert.equal(entitlementFor(sub({ status: "pending" }), row("pro_monthly")), null);
});
check(
  "yearly plans schedule the next monthly refill 30 days after period start; monthly don't",
  () => {
    assert.equal(
      nextRefillAt(row("pro_yearly"), "2026-10-01T00:00:00Z"),
      "2026-10-31T00:00:00.000Z",
    );
    assert.equal(nextRefillAt(row("pro_monthly"), "2026-10-01T00:00:00Z"), null);
  },
);

console.log(`\n${checks} checks passed`);
