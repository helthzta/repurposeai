import Link from "next/link";
import { DataTable, fmtDate, fmtUsd, StatCard, StatusBadge } from "@/components/admin/DataTable";
import { OverviewCharts, type DailyPoint } from "@/components/admin/OverviewCharts";
import { requireAdminPage } from "@/lib/admin-auth";
import { monthlyPriceCents, type BillingPlan } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminOverviewPage() {
  const { db } = await requireAdminPage();
  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const since7 = new Date(Date.now() - 7 * DAY_MS);

  const [users, newUsers, subs, plans, payments, generations, ledger, failures] = await Promise.all(
    [
      db.from("profiles").select("*", { count: "exact", head: true }),
      db
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since7.toISOString()),
      db.from("subscriptions").select("plan_id, status, cancel_at_period_end"),
      db.from("billing_plans").select("*"),
      db
        .from("payments")
        .select("amount_cents, status, created_at")
        .gte("created_at", since30.toISOString()),
      db
        .from("generations")
        .select("status, created_at, est_cost_usd, provider_cost_usd")
        .gte("created_at", since30.toISOString()),
      db
        .from("credit_transactions")
        .select("amount, reason")
        .in("reason", ["generation", "generation_refund"])
        .gte("created_at", since30.toISOString()),
      db
        .from("error_logs")
        .select("id, scope, message, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ],
  );

  const planById = new Map((plans.data as BillingPlan[] | null)?.map((p) => [p.id, p]) ?? []);
  const activeSubs = (subs.data ?? []).filter((s) => ["active", "on_hold"].includes(s.status));
  const mrrCents = activeSubs.reduce((sum, s) => {
    const plan = planById.get(s.plan_id);
    return sum + (plan ? monthlyPriceCents(plan) : 0);
  }, 0);
  const yearly = activeSubs.filter(
    (s) => planById.get(s.plan_id)?.billing_interval === "year",
  ).length;
  const pendingCancels = activeSubs.filter((s) => s.cancel_at_period_end).length;

  const okPayments = (payments.data ?? []).filter((p) => p.status === "succeeded");
  const revenue30 = okPayments.reduce((s, p) => s + p.amount_cents, 0) / 100;
  const gens = generations.data ?? [];
  const completed = gens.filter((g) => g.status === "completed");
  const failed = gens.filter((g) => g.status === "failed");
  const realCost = completed.reduce((s, g) => s + Number(g.provider_cost_usd ?? 0), 0);
  const estCost = completed.reduce((s, g) => s + Number(g.est_cost_usd ?? 0), 0);
  const creditsSpent = -(ledger.data ?? []).reduce((s, t) => s + t.amount, 0);

  // 30 daily buckets, oldest first.
  const buckets = new Map<string, DailyPoint>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    buckets.set(dayKey(d), {
      day: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue: 0,
      completed: 0,
      failed: 0,
    });
  }
  for (const p of okPayments) {
    const b = buckets.get(dayKey(new Date(p.created_at)));
    if (b) b.revenue += p.amount_cents / 100;
  }
  for (const g of gens) {
    const b = buckets.get(dayKey(new Date(g.created_at)));
    if (b && g.status === "completed") b.completed += 1;
    if (b && g.status === "failed") b.failed += 1;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={users.count ?? 0}
          hint={`+${newUsers.count ?? 0} in the last 7 days`}
        />
        <StatCard
          label="Active subscriptions"
          value={activeSubs.length}
          hint={`${yearly} yearly · ${pendingCancels} cancelling at period end`}
        />
        <StatCard label="MRR" value={fmtUsd(mrrCents / 100)} hint="Yearly plans counted at ⅟₁₂" />
        <StatCard
          label="Revenue · 30 days"
          value={fmtUsd(revenue30)}
          hint={`${okPayments.length} payments`}
        />
        <StatCard
          label="Generations · 30 days"
          value={gens.length}
          hint={`${failed.length} failed (${gens.length ? Math.round((failed.length / gens.length) * 100) : 0}%)`}
        />
        <StatCard label="Credits spent · 30 days" value={creditsSpent} hint="Net of refunds" />
        <StatCard
          label="Real provider cost · 30 days"
          value={fmtUsd(realCost)}
          hint={`Estimate was ${fmtUsd(estCost)} for the same renders`}
        />
        <StatCard
          label="Gross margin · 30 days"
          value={fmtUsd(revenue30 - realCost)}
          hint="Revenue minus real render cost"
        />
      </div>

      <OverviewCharts data={[...buckets.values()]} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Latest failures</h2>
          <Link href="/admin/failures" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <DataTable
          rows={failures.data ?? []}
          rowKey={(r) => r.id}
          empty="No failures logged."
          columns={[
            {
              header: "When",
              cell: (r) => fmtDate(r.created_at),
              className: "w-40 whitespace-nowrap",
            },
            { header: "Where", cell: (r) => <StatusBadge status={r.scope} /> },
            { header: "Message", cell: (r) => <span className="line-clamp-2">{r.message}</span> },
          ]}
        />
      </div>
    </>
  );
}
