import {
  DataTable,
  fmtDate,
  fmtUsd,
  Pager,
  pageRange,
  PAGE_SIZE,
  StatusBadge,
  UserLink,
} from "@/components/admin/DataTable";
import { requireAdminPage } from "@/lib/admin-auth";
import { QUALITY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Every render with what we charged, what we expected it to cost, and what the provider billed. */
export default async function AdminGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { db } = await requireAdminPage();
  const { page, from, to } = pageRange((await searchParams).page);
  const { data, error } = await db
    .from("generations")
    .select(
      "id, status, duration_seconds, quality, aspect_ratio, credits_charged, est_cost_usd, provider_cost_usd, error_message, created_at, projects(name, user_id, profiles(email))",
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  type Row = (typeof data)[number] & {
    projects: { name: string; user_id: string; profiles: { email: string } | null } | null;
  };
  const rows = data.slice(0, PAGE_SIZE) as Row[];

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Real cost is OpenRouter&apos;s billed <code>usage.cost</code> for the job, recorded on
        completion. Rows from before cost tracking show “—”.
      </p>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="No generations yet."
        columns={[
          { header: "When", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
          {
            header: "Customer",
            cell: (r) =>
              r.projects ? (
                <UserLink
                  id={r.projects.user_id}
                  label={r.projects.profiles?.email ?? r.projects.user_id}
                />
              ) : (
                "—"
              ),
          },
          {
            header: "Spec",
            cell: (r) =>
              `${r.duration_seconds}s · ${QUALITY_LABELS[r.quality] ?? r.quality} · ${r.aspect_ratio}`,
            className: "whitespace-nowrap",
          },
          {
            header: "Status",
            cell: (r) => (
              <span title={r.error_message ?? undefined}>
                <StatusBadge status={r.status} />
              </span>
            ),
          },
          {
            header: "Credits",
            cell: (r) => r.credits_charged,
            className: "text-right tabular-nums",
          },
          {
            header: "Est. cost",
            cell: (r) => fmtUsd(r.est_cost_usd),
            className: "text-right tabular-nums",
          },
          {
            header: "Real cost",
            cell: (r) => fmtUsd(r.provider_cost_usd),
            className: "text-right tabular-nums",
          },
          {
            header: "Δ",
            cell: (r) =>
              r.provider_cost_usd != null && r.est_cost_usd != null
                ? `${Number(r.provider_cost_usd) >= Number(r.est_cost_usd) ? "+" : ""}${(Number(r.provider_cost_usd) - Number(r.est_cost_usd)).toFixed(2)}`
                : "—",
            className: "text-right tabular-nums",
          },
        ]}
      />
      <Pager page={page} hasMore={data.length > PAGE_SIZE} params={{}} />
    </>
  );
}
