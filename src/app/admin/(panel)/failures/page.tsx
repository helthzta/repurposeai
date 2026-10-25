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

/** error_logs: app errors, failed generations, failed payments/renewals, unresolved webhooks. */
export default async function AdminFailuresPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { db } = await requireAdminPage();
  const { page, from, to } = pageRange((await searchParams).page);
  const { data, error } = await db
    .from("error_logs")
    .select("id, scope, message, metadata, user_id, created_at, profiles(email)")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  type Row = (typeof data)[number] & { profiles: { email: string } | null };

  return (
    <>
      <DataTable
        rows={data.slice(0, PAGE_SIZE) as Row[]}
        rowKey={(r) => r.id}
        empty="No failures logged."
        columns={[
          {
            header: "When",
            cell: (r) => fmtDate(r.created_at),
            className: "w-36 whitespace-nowrap",
          },
          { header: "Scope", cell: (r) => <code className="text-xs">{r.scope}</code> },
          {
            header: "User",
            cell: (r) =>
              r.user_id ? <UserLink id={r.user_id} label={r.profiles?.email ?? r.user_id} /> : "—",
          },
          {
            header: "Message",
            cell: (r) => (
              <details>
                <summary className="cursor-pointer line-clamp-2">{r.message}</summary>
                {r.metadata && (
                  <pre className="mt-2 max-h-64 max-w-xl overflow-auto rounded-lg bg-muted p-3 text-[11px]">
                    {JSON.stringify(r.metadata, null, 2)}
                  </pre>
                )}
              </details>
            ),
          },
        ]}
      />
      <Pager page={page} hasMore={data.length > PAGE_SIZE} params={{}} />
    </>
  );
}
