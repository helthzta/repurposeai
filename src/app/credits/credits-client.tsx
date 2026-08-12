"use client";

import Link from "next/link";
import { Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Starter",
    price: "$19",
    credits: "350 credits / mo",
    features: ["15s & 30s videos", "1 AI provider", "Standard quality"],
  },
  {
    name: "Pro",
    price: "$39",
    credits: "700 credits / mo",
    features: ["All video lengths", "Ultra quality", "Priority rendering"],
  },
  {
    name: "Custom",
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
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState("starter");
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credits")
      .then((res) => res.json())
      .then((data) => {
        setBalance(data.balance);
        setPlan(data.plan);
        setTransactions(data.transactions ?? []);
      })
      .catch(() => toast.error("Could not load credits"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Credits">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent">
                <Zap className="h-6 w-6 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold tracking-tight">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${balance} credits`}
                </p>
                <p className="text-sm capitalize text-muted-foreground">{plan} plan</p>
              </div>
            </div>
            <Button asChild className="btn-glow rounded-xl font-semibold">
              <Link href="/contact">Buy more</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCustom = p.name === "Custom";
            return (
              <div
                key={p.name}
                className="hover-lift flex flex-col rounded-3xl border bg-card p-6 shadow-card"
              >
                <h3 className="text-[15px] font-bold">{p.name}</h3>
                {isCustom ? (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Tailored to your volume
                  </p>
                ) : (
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold tracking-tight">{p.price}</span>
                    <span className="text-xs font-medium text-muted-foreground">/ mo</span>
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
                    onClick={() =>
                      toast.info("Checkout isn't live yet", {
                        description: `Contact us to move to the ${p.name} plan for now.`,
                      })
                    }
                  >
                    Choose {p.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

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
