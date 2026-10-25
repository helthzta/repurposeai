import {
  DataTable,
  fmtDate,
  Pager,
  pageRange,
  PAGE_SIZE,
  StatusBadge,
  UserLink,
} from "@/components/admin/DataTable";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { db } = await requireAdminPage();
  const { q, page: pageParam } = await searchParams;
  const { page, from, to } = pageRange(pageParam);

  let query = db
    .from("profiles")
    .select("id, username, email, full_name, plan, credits_balance, plan_period_end, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);
  // Strip PostgREST filter syntax characters so the search box can't inject extra conditions.
  const term = q?.replace(/[,()*%]/g, " ").trim();
  if (term)
    query = query.or(`email.ilike.%${term}%,username.ilike.%${term}%,full_name.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data.slice(0, PAGE_SIZE);

  return (
    <>
      <form className="max-w-sm">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search email, username or name"
          className="h-10"
        />
      </form>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty={term ? "No users match that search." : "No users yet."}
        columns={[
          {
            header: "User",
            cell: (r) => (
              <div className="min-w-0">
                <UserLink id={r.id} label={r.full_name || `@${r.username}`} />
                <p className="truncate text-xs text-muted-foreground">{r.email}</p>
              </div>
            ),
          },
          { header: "Plan", cell: (r) => <StatusBadge status={r.plan} /> },
          {
            header: "Credits",
            cell: (r) => r.credits_balance,
            className: "text-right tabular-nums",
          },
          {
            header: "Period ends",
            cell: (r) => fmtDate(r.plan_period_end),
            className: "whitespace-nowrap",
          },
          { header: "Joined", cell: (r) => fmtDate(r.created_at), className: "whitespace-nowrap" },
        ]}
      />
      <Pager page={page} hasMore={data.length > PAGE_SIZE} params={{ q }} />
    </>
  );
}
