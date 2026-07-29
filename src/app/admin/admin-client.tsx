"use client";

import Link from "next/link";
import { Film, FolderKanban, Loader2, ShieldCheck, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Overview {
  userCount: number;
  newUsersThisWeek: number;
  projectCount: number;
  generationCount: number;
  completedCount: number;
  failedCount: number;
  totalCreditsSpent: number;
}

interface AdminUser {
  id: string;
  username: string;
  full_name: string | null;
  plan: string;
  credits_balance: number;
  is_admin: boolean;
  created_at: string;
  projectCount: number;
  generationCount: number;
  creditsSpent: number;
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-extrabold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview").then((res) => res.json()),
      fetch("/api/admin/users").then((res) => res.json()),
    ])
      .then(([overviewData, usersData]) => {
        setOverview(overviewData);
        setUsers(usersData.users ?? []);
      })
      .catch(() => toast.error("Could not load admin data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Admin">
      <div className="mx-auto max-w-6xl space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={Users} label="Total users" value={overview?.userCount ?? 0} />
              <StatTile
                icon={FolderKanban}
                label="Projects created"
                value={overview?.projectCount ?? 0}
              />
              <StatTile
                icon={Film}
                label={`Generations (${overview?.completedCount ?? 0} completed, ${overview?.failedCount ?? 0} failed)`}
                value={overview?.generationCount ?? 0}
              />
              <StatTile
                icon={Zap}
                label="Total credits spent"
                value={overview?.totalCreditsSpent ?? 0}
              />
            </div>

            <div className="rounded-3xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold">Users</h2>
                  <p className="text-xs text-muted-foreground">
                    {users.length} account{users.length === 1 ? "" : "s"} ·{" "}
                    {overview?.newUsersThisWeek ?? 0} new this week
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Generations</TableHead>
                      <TableHead>Credits spent</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <Link href={`/admin/users/${u.id}`} className="hover:underline">
                            <span className="font-semibold">{u.full_name || `@${u.username}`}</span>
                            {u.is_admin && (
                              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                                Admin
                              </span>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">{u.plan}</TableCell>
                        <TableCell>{u.credits_balance}</TableCell>
                        <TableCell>{u.projectCount}</TableCell>
                        <TableCell>{u.generationCount}</TableCell>
                        <TableCell>{u.creditsSpent}</TableCell>
                        <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {users.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">No users yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
