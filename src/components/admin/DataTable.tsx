import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Server-rendered building blocks for the admin pages — no client JS needed for read-only views.

export const PAGE_SIZE = 50;

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty = "Nothing here yet.",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  empty?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((c) => (
              <TableHead key={c.header} className={cn("whitespace-nowrap text-xs", c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((c) => (
                <TableCell key={c.header} className={cn("text-sm", c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

/** Prev/next links that keep the page's other query params. */
export function Pager({
  page,
  hasMore,
  params,
}: {
  page: number;
  hasMore: boolean;
  params: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const q = new URLSearchParams(
      Object.entries({ ...params, page: String(p) }).filter(([, v]) => v) as [string, string][],
    );
    return `?${q}`;
  };
  if (page === 1 && !hasMore) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      {page > 1 && (
        <Link href={href(page - 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted">
          Previous
        </Link>
      )}
      <span className="text-muted-foreground">Page {page}</span>
      {hasMore && (
        <Link href={href(page + 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted">
          Next
        </Link>
      )}
    </div>
  );
}

export function pageRange(pageParam: string | undefined) {
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  // Fetch one extra row to know whether a next page exists.
  return { page, from, to: from + PAGE_SIZE };
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success/15 text-success",
  succeeded: "bg-success/15 text-success",
  active: "bg-success/15 text-success",
  responded: "bg-success/15 text-success",
  processing: "bg-primary/10 text-primary",
  queued: "bg-primary/10 text-primary",
  new: "bg-primary/10 text-primary",
  on_hold: "bg-warning/20 text-warning-foreground",
  cancelling: "bg-warning/20 text-warning-foreground",
  pending: "bg-warning/20 text-warning-foreground",
  refunded: "bg-warning/20 text-warning-foreground",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("rounded-md font-medium capitalize", STATUS_STYLES[status])}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmtUsd = (value: number | string | null) =>
  value === null || value === undefined ? "—" : `$${Number(value).toFixed(2)}`;

export function UserLink({ id, label }: { id: string; label: string }) {
  return (
    <Link href={`/admin/users/${id}`} className="font-medium text-primary hover:underline">
      {label}
    </Link>
  );
}
