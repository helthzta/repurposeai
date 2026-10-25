import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataTable, fmtDate, fmtUsd, StatCard, StatusBadge } from "@/components/admin/DataTable";
import { requireAdminPage } from "@/lib/admin-auth";
import { QUALITY_LABELS } from "@/lib/types";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireAdminPage();
  const { id } = await params;

  const { data: profile } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [subs, payments, ledger, projects] = await Promise.all([
    db
      .from("subscriptions")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    db.from("payments").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    db
      .from("credit_transactions")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("projects")
      .select(
        "id, name, generations(id, status, duration_seconds, quality, credits_charged, provider_cost_usd, created_at)",
      )
      .eq("user_id", id),
  ]);
  const generations = (projects.data ?? [])
    .flatMap((p) => (p.generations ?? []).map((g) => ({ ...g, project: p.name })))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const paid = (payments.data ?? []).filter((p) => p.status === "succeeded");

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          aria-label="Back to users"
          className="grid h-9 w-9 place-items-center rounded-lg border hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">
            {profile.full_name || `@${profile.username}`}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {profile.email} · joined {fmtDate(profile.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Plan"
          value={<span className="capitalize">{profile.plan}</span>}
          hint={`Period ends ${fmtDate(profile.plan_period_end)}`}
        />
        <StatCard label="Credit balance" value={profile.credits_balance} />
        <StatCard
          label="Generations"
          value={generations.length}
          hint={`${generations.filter((g) => g.status === "failed").length} failed`}
        />
        <StatCard
          label="Lifetime paid"
          value={fmtUsd(paid.reduce((s, p) => s + p.amount_cents, 0) / 100)}
          hint={`${paid.length} payments`}
        />
      </div>

      <UserActions userId={id} currentPlan={profile.plan} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Subscriptions</h3>
        <DataTable
          rows={subs.data ?? []}
          rowKey={(r) => r.id}
          empty="Never subscribed."
          columns={[
            { header: "Plan", cell: (r) => r.plan_id },
            {
              header: "Status",
              cell: (r) => (
                <StatusBadge
                  status={r.cancel_at_period_end && r.status === "active" ? "cancelling" : r.status}
                />
              ),
            },
            { header: "Period ends", cell: (r) => fmtDate(r.current_period_end) },
            { header: "Dodo id", cell: (r) => <code className="text-xs">{r.id}</code> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Generations</h3>
        <DataTable
          rows={generations}
          rowKey={(r) => r.id}
          empty="No generations."
          columns={[
            { header: "When", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
            { header: "Project", cell: (r) => r.project },
            {
              header: "Spec",
              cell: (r) => `${r.duration_seconds}s · ${QUALITY_LABELS[r.quality] ?? r.quality}`,
            },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            {
              header: "Credits",
              cell: (r) => r.credits_charged,
              className: "text-right tabular-nums",
            },
            {
              header: "Real cost",
              cell: (r) => fmtUsd(r.provider_cost_usd),
              className: "text-right tabular-nums",
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Credit ledger (latest 50)</h3>
        <DataTable
          rows={ledger.data ?? []}
          rowKey={(r) => r.id}
          empty="No credit activity."
          columns={[
            { header: "When", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
            { header: "Reason", cell: (r) => r.reason.replace(/_/g, " ") },
            {
              header: "Amount",
              cell: (r) => (
                <span
                  className={r.amount < 0 ? "text-destructive" : r.amount > 0 ? "text-success" : ""}
                >
                  {r.amount > 0 ? "+" : ""}
                  {r.amount}
                </span>
              ),
              className: "text-right tabular-nums",
            },
            {
              header: "Balance",
              cell: (r) => r.balance_after,
              className: "text-right tabular-nums",
            },
          ]}
        />
      </section>
    </>
  );
}
