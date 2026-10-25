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

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { db } = await requireAdminPage();
  const { page, from, to } = pageRange((await searchParams).page);
  const { data, error } = await db
    .from("payments")
    .select("*, profiles(email)")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;

  return (
    <>
      <DataTable
        rows={data.slice(0, PAGE_SIZE)}
        rowKey={(r) => r.id}
        empty="No payments yet."
        columns={[
          { header: "When", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
          {
            header: "Customer",
            cell: (r) => <UserLink id={r.user_id} label={r.profiles?.email ?? r.user_id} />,
          },
          { header: "Plan", cell: (r) => r.plan_id ?? r.plan },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          {
            header: "Amount",
            cell: (r) => `${fmtUsd(r.amount_cents / 100)} ${r.currency}`,
            className: "text-right tabular-nums whitespace-nowrap",
          },
          {
            header: "Dodo payment",
            cell: (r) => <code className="text-xs">{r.dodo_payment_id}</code>,
          },
        ]}
      />
      <Pager page={page} hasMore={data.length > PAGE_SIZE} params={{}} />
    </>
  );
}
