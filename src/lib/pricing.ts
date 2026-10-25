import type { SupabaseClient } from "@supabase/supabase-js";
import type { Quality } from "@/lib/types";

// Prices and per-video credit costs live in the billing_plans / credit_rates tables (migration
// 0005), not in code — provider cost fluctuates, so they change with a row update, not a deploy.
// This file only holds the shapes and the math; it's imported by client components too.

export type PaidPlan = "starter" | "pro";
export type BillingInterval = "month" | "year";

export interface BillingPlan {
  id: string;
  plan: PaidPlan;
  billing_interval: BillingInterval;
  name: string;
  /** Charged once per interval — a yearly row is the whole year. */
  price_cents: number;
  credits_per_month: number;
  dodo_product_id: string | null;
  active: boolean;
  sort_order: number;
}

export interface CreditRate {
  duration_seconds: number;
  quality: Quality;
  credits: number;
  est_cost_usd: number;
}

export interface Pricing {
  plans: BillingPlan[];
  rates: CreditRate[];
}

/** Both tables are public-read (RLS), so any client works — the anon one on the landing page. */
export async function getPricing(client: SupabaseClient): Promise<Pricing> {
  const [plans, rates] = await Promise.all([
    client.from("billing_plans").select("*").eq("active", true).order("sort_order"),
    client.from("credit_rates").select("*"),
  ]);
  if (plans.error) throw plans.error;
  if (rates.error) throw rates.error;
  return {
    plans: plans.data as BillingPlan[],
    rates: (rates.data as CreditRate[]).map((r) => ({
      ...r,
      est_cost_usd: Number(r.est_cost_usd),
    })),
  };
}

/** null = this duration/quality combination isn't offered (e.g. the removed 480p tier). */
export function rateFor(rates: CreditRate[], durationSeconds: number, quality: Quality) {
  return rates.find((r) => r.duration_seconds === durationSeconds && r.quality === quality) ?? null;
}

/** Per-month price a plan is advertised at — the yearly row divided across 12 months. */
export function monthlyPriceCents(plan: Pick<BillingPlan, "price_cents" | "billing_interval">) {
  return plan.billing_interval === "year" ? Math.round(plan.price_cents / 12) : plan.price_cents;
}

/** Whole-percent saving of the yearly row vs paying the monthly row 12 times. */
export function yearlySavingPercent(monthly: BillingPlan, yearly: BillingPlan) {
  return Math.round((1 - yearly.price_cents / (monthly.price_cents * 12)) * 100);
}

/** How many videos of a given rate one month's allotment covers — the sheet's "no vids" column. */
export function videosPerMonth(plan: Pick<BillingPlan, "credits_per_month">, rate: CreditRate) {
  return Math.floor(plan.credits_per_month / rate.credits);
}

export function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

// Admin-granted plans (PATCH /api/admin/users/[id]) last one 30-day period; a failed renewal keeps
// access for GRACE_DAYS while Dodo retries (same constant in supabase/functions/_shared/billing.ts).
export const PERIOD_DAYS = 30;
export const GRACE_DAYS = 3;
