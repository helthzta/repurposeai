import { createFileRoute } from "@tanstack/react-router";
import { Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Credits — Repurpose AI" },
      { name: "description", content: "Manage your generation credits and upgrade your plan." },
    ],
  }),
  component: CreditsPage,
});

const plans = [
  { name: "Starter", price: "$29", credits: "300 credits / mo", features: ["15s & 30s videos", "2 AI providers", "Standard quality"], current: false },
  { name: "Pro", price: "$79", credits: "1,000 credits / mo", features: ["All video lengths", "All providers", "Ultra quality", "Priority rendering"], current: true },
  { name: "Enterprise", price: "Custom", credits: "Unlimited credits", features: ["Dedicated capacity", "Custom providers", "SSO & API access", "Success manager"], current: false },
];

function CreditsPage() {
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
                <p className="text-2xl font-extrabold tracking-tight">240 credits</p>
                <p className="text-sm text-muted-foreground">Resets in 12 days · Pro plan</p>
              </div>
            </div>
            <Button className="btn-glow rounded-xl font-semibold" onClick={() => toast.success("Top-up added")}>
              Buy more
            </Button>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Used this month: 760</span>
              <span>1,000 total</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-3/4 rounded-full gradient-primary" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "hover-lift flex flex-col rounded-3xl border bg-card p-6 shadow-card",
                plan.current && "border-primary/50 shadow-glow",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold">{plan.name}</h3>
                {plan.current && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight">{plan.price}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{plan.credits}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.current ? "outline" : "default"}
                className={cn("mt-6 rounded-xl font-semibold", !plan.current && "btn-glow")}
                onClick={() => toast.success(plan.current ? "You're on this plan" : `Switched to ${plan.name}`)}
              >
                {plan.current ? "Manage plan" : plan.price === "Custom" ? "Contact sales" : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
