import Link from "next/link";
import {
  DataTable,
  fmtDate,
  Pager,
  pageRange,
  PAGE_SIZE,
  StatusBadge,
  UserLink,
} from "@/components/admin/DataTable";
import { requireAdminPage } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS = {
  all: "All",
  active: "Active",
  cancelling: "Cancelling at period end",
  ended: "Cancelled / expired",
  problem: "On hold / failed",
} as const;
type Filter = keyof typeof FILTERS;

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { db } = await requireAdminPage();
  const params = await searchParams;
  const filter: Filter =
    params.filter && params.filter in FILTERS ? (params.filter as Filter) : "all";
  const { page, from, to } = pageRange(params.page);

  let query = db
    .from("subscriptions")
    .select("*, profiles(username, email)")
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (filter === "active") query = query.eq("status", "active").eq("cancel_at_period_end", false);
  if (filter === "cancelling")
    query = query.eq("status", "active").eq("cancel_at_period_end", true);
  if (filter === "ended") query = query.in("status", ["cancelled", "expired"]);
  if (filter === "problem") query = query.in("status", ["on_hold", "failed"]);
  const { data, error } = await query;
  if (error) throw error;

  return (
    <>
      <nav className="flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <Link
            key={f}
            href={`?filter=${f}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium",
              f === filter ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
            )}
          >
            {FILTERS[f]}
          </Link>
        ))}
      </nav>
      <DataTable
        rows={data.slice(0, PAGE_SIZE)}
        rowKey={(r) => r.id}
        empty="No subscriptions in this view."
        columns={[
          {
            header: "Customer",
            cell: (r) => <UserLink id={r.user_id} label={r.profiles?.email ?? r.user_id} />,
          },
          { header: "Plan", cell: (r) => r.plan_id },
          {
            header: "Status",
            cell: (r) => (
              <StatusBadge
                status={r.status === "active" && r.cancel_at_period_end ? "cancelling" : r.status}
              />
            ),
          },
          {
            header: "Current period",
            cell: (r) => `${fmtDate(r.current_period_start)} → ${fmtDate(r.current_period_end)}`,
            className: "whitespace-nowrap",
          },
          {
            header: "Cancelled",
            cell: (r) => fmtDate(r.cancelled_at),
            className: "whitespace-nowrap",
          },
          {
            header: "Next refill",
            cell: (r) => fmtDate(r.next_credit_refill_at),
            className: "whitespace-nowrap",
          },
        ]}
      />
      <Pager page={page} hasMore={data.length > PAGE_SIZE} params={{ filter }} />
    </>
  );
}
