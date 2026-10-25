import { DataTable, fmtDate } from "@/components/admin/DataTable";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Admin audit trail + the raw stream of Dodo webhook deliveries. */
export default async function AdminActivityPage() {
  const { db } = await requireAdminPage();
  const [auditLog, webhooks] = await Promise.all([
    db
      .from("admin_audit_log")
      .select("id, action, target_type, target_id, metadata, ip, created_at, admin_users(email)")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("dodo_webhook_events").select("*").order("received_at", { ascending: false }).limit(50),
  ]);
  type AuditRow = NonNullable<typeof auditLog.data>[number] & {
    admin_users: { email: string } | null;
  };

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Admin audit log</h2>
        <DataTable
          rows={(auditLog.data ?? []) as AuditRow[]}
          rowKey={(r) => r.id}
          empty="No admin activity yet."
          columns={[
            { header: "When", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
            { header: "Admin", cell: (r) => r.admin_users?.email ?? "—" },
            { header: "Action", cell: (r) => <code className="text-xs">{r.action}</code> },
            {
              header: "Target",
              cell: (r) =>
                r.target_type ? `${r.target_type} ${r.target_id?.slice(0, 8) ?? ""}` : "—",
            },
            {
              header: "Details",
              cell: (r) => (
                <span className="text-xs text-muted-foreground">
                  {r.metadata ? JSON.stringify(r.metadata) : ""}
                </span>
              ),
            },
            { header: "IP", cell: (r) => r.ip ?? "—", className: "text-xs" },
          ]}
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Dodo webhook deliveries</h2>
        <DataTable
          rows={webhooks.data ?? []}
          rowKey={(r) => r.id}
          empty="No webhooks received yet."
          columns={[
            {
              header: "Received",
              cell: (r) => fmtDate(r.received_at),
              className: "whitespace-nowrap",
            },
            { header: "Event", cell: (r) => <code className="text-xs">{r.type}</code> },
            { header: "Webhook id", cell: (r) => <code className="text-xs">{r.id}</code> },
          ]}
        />
      </section>
    </>
  );
}
