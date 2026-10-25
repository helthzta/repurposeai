"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Landed on after a Dodo checkout redirect — this is NOT proof of payment (Dodo's own guidance:
 * "always fulfill from the webhook, not the browser redirect"). The dodo-webhook Edge Function
 * grants credits/plan asynchronously, which can lag this redirect by a few seconds, so this page
 * polls /api/credits and only shows success once the plan actually reflects the purchase.
 */
export function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  // A billing_plans id, e.g. "pro_yearly" — confirmed once the webhook has made it the current subscription.
  const expectedPlanId = searchParams.get("plan");
  const [confirmed, setConfirmed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (confirmed || attempts >= 15) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/credits");
        const data = await res.json();
        if (
          data.subscription?.plan_id === expectedPlanId &&
          data.subscription?.status === "active"
        ) {
          setConfirmed(true);
          return;
        }
      } catch {
        // keep polling — a transient fetch failure isn't worth surfacing here
      }
      setAttempts((n) => n + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [attempts, confirmed, expectedPlanId]);

  const timedOut = !confirmed && attempts >= 15;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-card">
        {confirmed ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h1 className="mt-4 text-lg font-extrabold tracking-tight">Payment confirmed</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your subscription is active and your credits have landed.
            </p>
          </>
        ) : timedOut ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 text-lg font-extrabold tracking-tight">Almost there</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Payment went through — it can take a little longer than usual to reflect. Check your
              Credits page in a minute.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-4 text-lg font-extrabold tracking-tight">Confirming payment</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">This only takes a few seconds.</p>
          </>
        )}
        <Button asChild className="btn-glow mt-6 w-full rounded-xl font-semibold">
          <Link href="/credits">Go to Credits</Link>
        </Button>
      </div>
    </div>
  );
}
