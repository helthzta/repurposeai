import { DataTable, fmtDate, StatusBadge } from "@/components/admin/DataTable";
import { requireAdminPage } from "@/lib/admin-auth";
import { ToggleResponded } from "./toggle-responded";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const { db } = await requireAdminPage();
  const { data, error } = await db
    .from("contact_submissions")
    .select("id, name, email, plan_interest, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  return (
    <DataTable
      rows={data}
      rowKey={(r) => r.id}
      empty="No contact requests yet."
      columns={[
        { header: "When", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
        {
          header: "From",
          cell: (r) => (
            <div>
              <p className="font-medium">{r.name}</p>
              <a href={`mailto:${r.email}`} className="text-xs text-primary hover:underline">
                {r.email}
              </a>
            </div>
          ),
        },
        { header: "Interest", cell: (r) => r.plan_interest ?? "—" },
        {
          header: "Message",
          cell: (r) => <p className="max-w-md whitespace-pre-wrap text-xs">{r.message}</p>,
        },
        { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        { header: "", cell: (r) => <ToggleResponded id={r.id} status={r.status} /> },
      ]}
    />
  );
}
