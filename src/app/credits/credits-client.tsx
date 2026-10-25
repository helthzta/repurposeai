"use client";

import { AlertTriangle, CalendarClock, Loader2, RotateCcw, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { PricingTable } from "@/components/pricing/PricingTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePricing } from "@/hooks/use-pricing";
import { PLAN_LABELS } from "@/lib/types";

interface CreditTransaction {
  id: string;
  amount: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

interface CreditsData {
  balance: number;
  plan: string;
  planPeriodEnd: string | null;
  planGraceEnd: string | null;
  subscription: {
    plan_id: string;
    status: string;
    cancel_at_period_end: boolean;
    current_period_end: string | null;
  } | null;
  transactions: CreditTransaction[];
}

const REASON_LABELS: Record<string, string> = {
  generation: "Video generation",
  generation_refund: "Refund — generation failed",
  plan_activated: "Plan started",
  plan_renewal: "Plan renewed",
  plan_monthly_refill: "Monthly credits",
  plan_changed: "Plan changed",
  plan_expired: "Plan ended — credits expired",
  subscription_cancelled: "Cancellation scheduled",
  subscription_resumed: "Cancellation undone",
  admin_adjustment: "Adjusted by support",
  signup_bonus: "Sign-up bonus",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function CreditsPageClient() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { data: pricing, isError: pricingError } = usePricing();

  const load = useCallback(() => {
    setLoadError(false);
    fetch("/api/credits")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setData(await res.json());
      })
      .catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  const choosePlan = async (planId: string) => {
    setBusyPlanId(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start checkout");
      if (body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      toast.success("Plan change requested", {
        description: "Your plan and credits update as soon as Dodo confirms the change.",
      });
      setTimeout(load, 4000);
    } catch (err) {
      toast.error("Couldn't change plan", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
    setBusyPlanId(null);
  };

  const setCancellation = async (resume: boolean) => {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      toast.success(resume ? "Your subscription will renew" : "Subscription cancelled", {
        description:
          !resume && body.accessUntil
            ? `You keep your plan and credits until ${formatDate(body.accessUntil)}.`
            : undefined,
      });
      setConfirmCancel(false);
      load();
    } catch (err) {
      toast.error(resume ? "Couldn't resume" : "Couldn't cancel", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCancelling(false);
    }
  };

  const sub = data?.subscription ?? null;
  const currentPlan = pricing?.plans.find((p) => p.id === sub?.plan_id);
  const paid = data && data.plan !== "free";

  return (
    <AppShell title="Credits">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Balance + plan */}
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          {loadError ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Couldn&apos;t load your credits.
              <Button size="sm" variant="outline" className="rounded-lg" onClick={load}>
                Retry
              </Button>
            </div>
          ) : !data ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent">
                  <Zap className="h-6 w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums">
                    {data.balance} credits
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paid && currentPlan
                      ? `${currentPlan.name} · ${currentPlan.billing_interval === "year" ? "yearly" : "monthly"}`
                      : paid
                        ? `${PLAN_LABELS[data.plan] ?? data.plan} plan`
                        : "No active plan — choose one below to start generating"}
                  </p>
                </div>
              </div>
              {paid && data.planPeriodEnd && (
                <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {sub?.cancel_at_period_end
                    ? `Ends ${formatDate(data.planPeriodEnd)}`
                    : sub?.status === "on_hold"
                      ? `Payment failed — retrying until ${formatDate(data.planGraceEnd ?? data.planPeriodEnd)}`
                      : `Renews ${formatDate(data.planPeriodEnd)}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Plans */}
        <section aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="mb-6 text-lg font-bold">
            {paid ? "Change plan" : "Choose a plan"}
          </h2>
          {pricing ? (
            <PricingTable
              plans={pricing.plans}
              rates={pricing.rates}
              onChoose={choosePlan}
              busyPlanId={busyPlanId}
              currentPlanId={sub?.plan_id ?? null}
            />
          ) : pricingError ? (
            <p className="text-sm text-destructive">
              Couldn&apos;t load plans. Refresh to try again.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[30rem] rounded-3xl" />
              ))}
            </div>
          )}
        </section>

        {/* Cancel / resume */}
        {paid && sub && (
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            {sub.cancel_at_period_end ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-bold">Cancellation scheduled</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your plan and remaining credits stay active until{" "}
                    {data?.planPeriodEnd
                      ? formatDate(data.planPeriodEnd)
                      : "the end of this period"}
                    . After that, unused credits expire and you won&apos;t be charged again.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl font-semibold"
                  disabled={cancelling}
                  onClick={() => setCancellation(true)}
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Keep my subscription
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold">Cancel subscription</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You won&apos;t be charged again. You keep your plan and credits until{" "}
                    {data?.planPeriodEnd
                      ? formatDate(data.planPeriodEnd)
                      : "the end of this period"}
                    ; payments already made aren&apos;t refunded.
                  </p>
                  {!confirmCancel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 rounded-xl border-destructive/30 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel subscription
                    </Button>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                      <p className="flex-1 text-xs font-medium text-destructive">
                        Cancel at the end of this billing period? You can undo this until then.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-xs"
                          onClick={() => setConfirmCancel(false)}
                          disabled={cancelling}
                        >
                          Keep plan
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-lg text-xs font-semibold"
                          onClick={() => setCancellation(false)}
                          disabled={cancelling}
                        >
                          {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Yes, cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity */}
        <div className="rounded-3xl border bg-card p-6 shadow-card">
          <h3 className="text-sm font-bold">Recent activity</h3>
          <div className="mt-4 divide-y">
            {data && data.transactions.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No credit activity yet.
              </p>
            )}
            {!data &&
              !loadError &&
              [0, 1, 2].map((i) => <Skeleton key={i} className="my-3 h-5 w-full" />)}
            {data?.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">
                    {REASON_LABELS[tx.reason] ?? tx.reason.replace(/_/g, " ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(tx.created_at)}</p>
                </div>
                <span
                  className={
                    tx.amount < 0
                      ? "font-semibold tabular-nums text-destructive"
                      : tx.amount > 0
                        ? "font-semibold tabular-nums text-success"
                        : "tabular-nums text-muted-foreground"
                  }
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
