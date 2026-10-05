"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [creditsDelta, setCreditsDelta] = useState("");
  const [saving, setSaving] = useState(false);

  const updateUser = async (body: { creditsDelta?: number; plan?: string }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update user");
      setDetail((prev) => (prev ? { ...prev, profile: data.profile } : prev));
      setCreditsDelta("");
      toast.success("User updated");
    } catch (err) {
      toast.error("Update failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

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
          <h2 className="text-sm font-bold">Manage credits &amp; plan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Manual changes for testing and support — no payment is taken.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="credits-delta" className="text-xs text-muted-foreground">
                  Add or remove credits (use a minus sign to remove)
                </label>
                <Input
                  id="credits-delta"
                  type="number"
                  step={1}
                  placeholder="e.g. 100 or -20"
                  className="h-10 rounded-xl"
                  value={creditsDelta}
                  onChange={(e) => setCreditsDelta(e.target.value)}
                />
              </div>
              <Button
                className="rounded-xl font-semibold"
                disabled={
                  saving || !Number.isInteger(Number(creditsDelta)) || !Number(creditsDelta)
                }
                onClick={() => updateUser({ creditsDelta: Number(creditsDelta) })}
              >
                Apply
              </Button>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Set plan (paid plans run 30 days)</p>
              <div className="flex flex-wrap gap-2">
                {(["free", "starter", "pro", "custom"] as const).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={profile.plan === p ? "default" : "outline"}
                    className="rounded-lg text-xs font-semibold capitalize"
                    disabled={saving || profile.plan === p}
                    onClick={() => updateUser({ plan: p })}
                  >
                    {p}
                  </Button>
                ))}
              </div>
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
