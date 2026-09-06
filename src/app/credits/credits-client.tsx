"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import type { PaidPlan } from "@/lib/payments/plans";

const PLANS = [
  {
    name: "Starter",
    planKey: "starter" as PaidPlan,
    price: "$19",
    credits: "350 credits",
    features: ["15s & 30s videos", "1 AI provider", "720p quality"],
  },
  {
    name: "Pro",
    planKey: "pro" as PaidPlan,
    price: "$39",
    credits: "700 credits",
    features: ["All video lengths", "HD 1080p quality", "Priority rendering"],
  },
  {
    name: "Custom",
    planKey: null,
    price: null,
    credits: null,
    features: ["Dedicated capacity", "SSO & API access", "Success manager"],
  },
] as const;

interface CreditTransaction {
  id: string;
  amount: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

export function CreditsPageClient() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [planGraceEnd, setPlanGraceEnd] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOutPlan, setCheckingOutPlan] = useState<PaidPlan | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/credits")
      .then((res) => res.json())
      .then((data) => {
        setBalance(data.balance);
        setPlan(data.plan);
        setIsAdmin(!!data.isAdmin);
        setPlanGraceEnd(data.planGraceEnd);
        setTransactions(data.transactions ?? []);
      })
      .catch(() => toast.error("Could not load credits"))
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (planKey: PaidPlan) => {
    setCheckingOutPlan(planKey);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error("Checkout failed to start", {
        description: err instanceof Error ? err.message : undefined,
      });
      setCheckingOutPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel subscription");
      toast.success("Subscription cancelled", {
        description: "You've been moved to the free plan.",
      });
      setPlan("free");
      setPlanGraceEnd(null);
      setShowCancelConfirm(false);
      router.refresh();
    } catch (err) {
      toast.error("Cancellation failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCancelling(false);
    }
  };

  // Only meaningful once plan is actually 'starter'/'pro' — payment.succeeded stamps this,
  // expire-subscriptions clears it back to 'free' once it passes with no renewal.
  const isPastGrace = planGraceEnd ? new Date(planGraceEnd).getTime() < Date.now() : false;
  const hasActivePaidPlan = plan === "starter" || plan === "pro";

  return (
    <AppShell title="Credits">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Balance card */}
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent">
                {isAdmin ? (
                  <ShieldCheck className="h-6 w-6 text-primary" />
                ) : (
                  <Zap className="h-6 w-6 text-warning" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold tracking-tight">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : isAdmin ? (
                    "Admin Account"
                  ) : (
                    `${balance} credits`
                  )}
                </p>
                <p className="text-sm capitalize text-muted-foreground">
                  {isAdmin ? "Unlimited access for testing" : `${plan} plan`}
                  {planGraceEnd && hasActivePaidPlan && !isAdmin && (
                    <span className={isPastGrace ? "text-destructive" : ""}>
                      {" · "}
                      {isPastGrace ? "renewal overdue" : "renews by"}{" "}
                      {new Date(planGraceEnd).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {!isAdmin && (
              <Button asChild className="btn-glow rounded-xl font-semibold">
                <Link href="/contact">Buy more</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Admin banner — skip payment plans entirely */}
        {isAdmin ? (
          <div className="rounded-3xl border border-primary/30 bg-accent/40 p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-primary shadow-card">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold">Admin — Full Access</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Admin accounts bypass payment plans and credit limits. You can generate and test
                  all features freely. Use the{" "}
                  <Link href="/admin" className="font-semibold text-primary hover:underline">
                    Admin Dashboard
                  </Link>{" "}
                  to manage users, plans, and credits.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Payment plans — users only */
          <>
            <div className="grid gap-5 md:grid-cols-3">
              {PLANS.map((p) => {
                const isCustom = p.planKey === null;
                const isCurrent = p.planKey !== null && p.planKey === plan;
                return (
                  <div
                    key={p.name}
                    className="hover-lift flex flex-col rounded-3xl border bg-card p-6 shadow-card"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-bold">{p.name}</h3>
                      {isCurrent && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                          Current
                        </span>
                      )}
                    </div>
                    {isCustom ? (
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Tailored to your volume
                      </p>
                    ) : (
                      <p className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold tracking-tight">{p.price}</span>
                        <span className="text-xs font-medium text-muted-foreground">
                          / 30-day period
                        </span>
                      </p>
                    )}
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {p.credits ?? "Custom credit allotment"}
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {p.features.map((f) => (
                        <li key={f} className="text-sm text-muted-foreground">
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCustom ? (
                      <Button asChild variant="outline" className="mt-6 rounded-xl font-semibold">
                        <Link href="/contact?plan=Custom">Contact Us</Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="mt-6 rounded-xl font-semibold"
                        disabled={checkingOutPlan !== null}
                        onClick={() => handleCheckout(p.planKey)}
                      >
                        {checkingOutPlan === p.planKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCurrent ? (
                          "Renew"
                        ) : (
                          `Choose ${p.name}`
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cancel subscription — only shown when user has an active paid plan */}
            {hasActivePaidPlan && (
              <div className="rounded-3xl border border-destructive/20 bg-card p-6 shadow-card">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-bold">Cancel Subscription</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cancelling will immediately move your account to the free plan. Your current
                      credits will remain but no further renewals will occur.
                    </p>
                    {!showCancelConfirm ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 rounded-xl border-destructive/30 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setShowCancelConfirm(true)}
                      >
                        Cancel {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                      </Button>
                    ) : (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        <p className="flex-1 text-xs font-medium text-destructive">
                          Are you sure? This cannot be undone. You'll be moved to the free plan immediately.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => setShowCancelConfirm(false)}
                            disabled={cancelling}
                          >
                            Keep Plan
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-lg bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleCancelSubscription}
                            disabled={cancelling}
                          >
                            {cancelling ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            Yes, Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Recent activity */}
        <div className="rounded-3xl border bg-card p-6 shadow-card">
          <h3 className="text-sm font-bold">Recent activity</h3>
          <div className="mt-4 space-y-2">
            {transactions.length === 0 && (
              <p className="text-xs text-muted-foreground">No credit activity yet.</p>
            )}
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">
                  {tx.reason.replace(/_/g, " ")}
                </span>
                <span className={tx.amount < 0 ? "text-destructive" : "text-success"}>
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
