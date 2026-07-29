"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Generation, Profile, Project } from "@/lib/types";

interface CreditTransaction {
  id: string;
  amount: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

interface UserDetail {
  profile: Profile;
  projects: (Project & { generations: Generation[] })[];
  transactions: CreditTransaction[];
}

export function AdminUserDetailClient({ userId }: { userId: string }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((res) => res.json())
      .then((data) => setDetail(data))
      .catch(() => toast.error("Could not load user"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <AppShell title="User">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!detail?.profile) {
    return (
      <AppShell title="User">
        <p className="py-20 text-center text-sm text-muted-foreground">User not found.</p>
      </AppShell>
    );
  }

  const { profile, projects, transactions } = detail;
  const totalGenerations = projects.reduce((sum, p) => sum + (p.generations?.length ?? 0), 0);
  const totalCreditsSpent = projects.reduce(
    (sum, p) =>
      sum +
      (p.generations ?? []).reduce(
        (s, g) => s + (g.status === "completed" ? g.credits_charged : 0),
        0,
      ),
    0,
  );

  return (
    <AppShell title={profile.full_name || `@${profile.username}`}>
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="outline" size="icon" className="rounded-xl" asChild>
          <Link href="/admin" aria-label="Back to admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="rounded-3xl border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="font-semibold">@{profile.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-semibold capitalize">{profile.plan}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Credit balance</p>
              <p className="font-semibold">{profile.credits_balance}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total credits spent</p>
              <p className="font-semibold">{totalCreditsSpent}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Projects</p>
              <p className="font-semibold">{projects.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Generations</p>
              <p className="font-semibold">{totalGenerations}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-card">
          <h2 className="text-sm font-bold">Projects</h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generations</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="capitalize">{p.status}</TableCell>
                    <TableCell>{p.generations?.length ?? 0}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {projects.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-card">
          <h2 className="text-sm font-bold">Recent credit activity</h2>
          <div className="mt-4 space-y-2">
            {transactions.length === 0 && (
              <p className="text-xs text-muted-foreground">No credit activity yet.</p>
            )}
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">
                  {tx.reason.replace(/_/g, " ")}
                </span>
                <span className={tx.amount < 0 ? "text-destructive" : "text-success"}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
