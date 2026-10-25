"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Manual support/testing controls — every change is audit-logged server-side. */
export function UserActions({ userId, currentPlan }: { userId: string; currentPlan: string }) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [saving, setSaving] = useState(false);

  const update = async (body: { creditsDelta?: number; plan?: string }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setDelta("");
      toast.success("User updated");
      router.refresh();
    } catch (err) {
      toast.error("Update failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const n = Number(delta);
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold">Support actions</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        No payment is taken. Use for support or to give a test account credits. A plan set here runs
        30 days and is not a Dodo subscription.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="credits-delta" className="text-xs text-muted-foreground">
              Add or remove credits (negative to remove)
            </label>
            <Input
              id="credits-delta"
              type="number"
              step={1}
              placeholder="e.g. 70 or -20"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
          </div>
          <Button
            disabled={saving || !Number.isInteger(n) || n === 0}
            onClick={() => update({ creditsDelta: n })}
          >
            Apply
          </Button>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Set plan</p>
          <div className="flex flex-wrap gap-2">
            {(["free", "starter", "pro", "custom"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={currentPlan === p ? "default" : "outline"}
                className="capitalize"
                disabled={saving || currentPlan === p}
                onClick={() => update({ plan: p })}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
