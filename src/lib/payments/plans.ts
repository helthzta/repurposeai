/**
 * Single source of truth for the two paid, self-serve plans. The Custom plan isn't here —
 * it's Contact-Us only (D-023/D-024), never goes through Dodo.
 *
 * `productIdEnvVar` names the .env var (populated by `scripts/setup-dodo-products.ts`) holding
 * that plan's Dodo product id — read lazily via `productId()` below, not at module load, so a
 * route can give a clear error instead of crashing at import time if setup hasn't run yet.
 */
export type PaidPlan = "starter" | "pro";

export const PLAN_CONFIG: Record<
  PaidPlan,
  { name: string; credits: number; priceCents: number; productIdEnvVar: string }
> = {
  starter: {
    name: "Starter",
    credits: 350,
    priceCents: 1900,
    productIdEnvVar: "DODO_STARTER_PRODUCT_ID",
  },
  pro: {
    name: "Pro",
    credits: 700,
    priceCents: 3900,
    productIdEnvVar: "DODO_PRO_PRODUCT_ID",
  },
};

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "starter" || value === "pro";
}

export function productId(plan: PaidPlan): string {
  const id = process.env[PLAN_CONFIG[plan].productIdEnvVar];
  if (!id) {
    throw new Error(
      `${PLAN_CONFIG[plan].productIdEnvVar} is not set — run \`npm run setup:dodo\` and add the printed product id to your .env`,
    );
  }
  return id;
}

// One paid period always lasts 30 days, followed by a 3-day grace window before
// expire-subscriptions (the scheduled Edge Function) downgrades the account back to 'free'.
export const PERIOD_DAYS = 30;
export const GRACE_DAYS = 3;
