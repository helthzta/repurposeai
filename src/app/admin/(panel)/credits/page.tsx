import {
  DataTable,
  fmtDate,
  Pager,
  pageRange,
  PAGE_SIZE,
  UserLink,
} from "@/components/admin/DataTable";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Every balance change — generations, refunds, plan resets/refills, expiries, admin adjustments. */
export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { db } = await requireAdminPage();
  const { page, from, to } = pageRange((await searchParams).page);
  const { data, error } = await db
    .from("credit_transactions")
    .select("*, profiles(email)")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;

  return (
    <>
      <DataTable
        rows={data.slice(0, PAGE_SIZE)}
        rowKey={(r) => r.id}
        empty="No credit activity yet."
        columns={[
          { header: "When", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
          {
            header: "Customer",
            cell: (r) => <UserLink id={r.user_id} label={r.profiles?.email ?? r.user_id} />,
          },
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
            header: "Balance after",
            cell: (r) => r.balance_after,
            className: "text-right tabular-nums",
          },
        ]}
      />
      <Pager page={page} hasMore={data.length > PAGE_SIZE} params={{}} />
    </>
  );
}
