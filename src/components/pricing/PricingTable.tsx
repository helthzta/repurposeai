"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  formatUsd,
  monthlyPriceCents,
  videosPerMonth,
  yearlySavingPercent,
  type BillingInterval,
  type BillingPlan,
  type CreditRate,
  type PaidPlan,
} from "@/lib/pricing";
import { QUALITY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_COPY: Record<PaidPlan, { tagline: string; perks: string[]; featured: boolean }> = {
  starter: {
    tagline: "For founders testing their first AI ads",
    perks: ["15s & 30s generation", "720p and HD 1080p", "AI analysis + script repurposing"],
    featured: false,
  },
  pro: {
    tagline: "For brands shipping new creatives every week",
    perks: ["Everything in Start", "2.4× the monthly credits", "Priority support"],
    featured: true,
  },
};

/**
 * Start / Pro / Custom with a monthly–yearly toggle. Prices and credit math come from the
 * billing_plans + credit_rates rows passed in, never from constants here. Used on the landing
 * page (links to sign-up) and on /credits (onChoose starts checkout).
 */
export function PricingTable({
  plans,
  rates,
  ctaHref,
  onChoose,
  busyPlanId,
  currentPlanId,
}: {
  plans: BillingPlan[];
  rates: CreditRate[];
  /** Landing page: where each plan's button links (the plan id is appended as ?plan=). */
  ctaHref?: string;
  /** Credits page: called with the billing_plans id instead of navigating. */
  onChoose?: (planId: string) => void;
  busyPlanId?: string | null;
  currentPlanId?: string | null;
}) {
  const current = plans.find((p) => p.id === currentPlanId);
  const [interval, setInterval] = useState<BillingInterval>(current?.billing_interval ?? "month");

  const byPlan = (plan: PaidPlan, i: BillingInterval) =>
    plans.find((p) => p.plan === plan && p.billing_interval === i);
  const saving = (() => {
    const m = byPlan("starter", "month");
    const y = byPlan("starter", "year");
    return m && y ? yearlySavingPercent(m, y) : 20;
  })();
  const sortedRates = [...rates].sort(
    (a, b) => a.duration_seconds - b.duration_seconds || a.credits - b.credits,
  );

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex items-center gap-1 rounded-full border bg-card p-1 shadow-card"
        >
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={interval === i}
              onClick={() => setInterval(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
                interval === i
                  ? "bg-foreground text-background shadow-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {i === "month" ? "Monthly" : "Yearly"}
              {i === "year" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    interval === "year"
                      ? "bg-success text-success-foreground"
                      : "bg-success/15 text-success",
                  )}
                >
                  Save {saving}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {(["starter", "pro"] as const).map((key) => {
          const plan = byPlan(key, interval);
          const monthly = byPlan(key, "month");
          if (!plan) return null;
          const copy = PLAN_COPY[key];
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={key}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-7 shadow-card transition-shadow duration-300 hover:shadow-lift",
                copy.featured && "border-primary/40 ring-1 ring-primary/20",
              )}
            >
              {copy.featured && (
                <span className="absolute -top-3 left-7 rounded-full gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                  Most popular
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl italic">{plan.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{copy.tagline}</p>

              <div className="mt-6 flex items-end gap-2">
                <span className="text-5xl font-extrabold tracking-tight tabular-nums">
                  {formatUsd(monthlyPriceCents(plan))}
                </span>
                <span className="pb-1.5 text-sm font-medium text-muted-foreground">/ month</span>
                {interval === "year" && monthly && (
                  <span className="pb-1.5 text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/60">
                    {formatUsd(monthly.price_cents)}
                  </span>
                )}
              </div>
              <p className="mt-1 h-5 text-xs text-muted-foreground">
                {interval === "year"
                  ? `${formatUsd(plan.price_cents)} billed yearly${monthly ? ` · you save ${formatUsd(monthly.price_cents * 12 - plan.price_cents)}` : ""}`
                  : "Billed monthly · cancel anytime"}
              </p>

              <div className="mt-6 rounded-2xl bg-muted/60 p-4">
                <p className="text-sm font-bold">
                  {plan.credits_per_month} credits{" "}
                  <span className="font-medium text-muted-foreground">every month</span>
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  {sortedRates.map((r) => (
                    <li key={`${r.duration_seconds}-${r.quality}`} className="tabular-nums">
                      <span className="font-semibold text-foreground">
                        {videosPerMonth(plan, r)}×
                      </span>{" "}
                      {r.duration_seconds}s {QUALITY_LABELS[r.quality]}
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {copy.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>

              {onChoose ? (
                <Button
                  className={cn("mt-7 h-11 rounded-xl font-semibold", copy.featured && "btn-glow")}
                  variant={copy.featured ? "default" : "outline"}
                  disabled={!!busyPlanId || isCurrent}
                  onClick={() => onChoose(plan.id)}
                >
                  {busyPlanId === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Your plan"
                  ) : current ? (
                    `Switch to ${plan.name} ${interval === "year" ? "yearly" : "monthly"}`
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </Button>
              ) : (
                <Button
                  asChild
                  className={cn("mt-7 h-11 rounded-xl font-semibold", copy.featured && "btn-glow")}
                  variant={copy.featured ? "default" : "outline"}
                >
                  <Link href={`${ctaHref ?? "/signup"}?plan=${plan.id}`}>Choose {plan.name}</Link>
                </Button>
              )}
            </div>
          );
        })}

        <div className="flex flex-col rounded-3xl border border-dashed bg-card/60 p-7">
          <h3 className="font-display text-2xl italic">Custom</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Production-grade generation at volume
          </p>
          <p className="mt-6 text-3xl font-extrabold tracking-tight">Let&apos;s talk</p>
          <p className="mt-1 h-5 text-xs text-muted-foreground">Priced to your volume and models</p>
          <ul className="mt-6 flex-1 space-y-2.5">
            {[
              "Production-grade models and resolutions",
              "Custom credit allotment",
              "API access",
              "Dedicated success manager",
            ].map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {perk}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-7 h-11 rounded-xl font-semibold">
            <Link href="/contact?plan=Custom">Contact sales</Link>
          </Button>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
        Credits reset each month and don&apos;t roll over. Cancel anytime — you keep your plan and
        credits until the end of the period you&apos;ve paid for. Custom pricing may change with
        provider costs.
      </p>
    </div>
  );
}
