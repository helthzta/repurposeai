"use client";

import { Copy, KeyRound, Loader2, Plug, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApiKey } from "@/lib/types";

export function ApiPageClient() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/api-keys")
      .then((res) => res.json())
      .then((data) => setApiKeys(data.apiKeys ?? []))
      .catch(() => toast.error("Could not load API keys"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleGenerate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Key ${apiKeys.length + 1}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create key");
      setNewKey(data.plainKey);
      load();
    } catch (err) {
      toast.error("Could not create key", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not revoke key");
      return;
    }
    toast.success("Key revoked");
    load();
  };

  return (
    <AppShell title="API">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold">API Keys</h2>
              <p className="text-xs text-muted-foreground">
                Authenticate requests to the Repurpose API
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!loading && apiKeys.length === 0 && (
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            )}
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{key.name}</p>
                  <code className="truncate text-xs text-muted-foreground">{key.key_prefix}</code>
                </div>
                {key.revoked_at ? (
                  <span className="text-xs font-medium text-muted-foreground">Revoked</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-muted-foreground hover:text-destructive"
                    aria-label="Revoke key"
                    onClick={() => handleRevoke(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="mt-4 rounded-xl font-semibold"
            onClick={handleGenerate}
            disabled={creating}
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate new key
          </Button>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold">Quick start</h2>
              <p className="text-xs text-muted-foreground">
                Generate a commercial with one request
              </p>
            </div>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-foreground p-5 text-xs leading-relaxed text-background">
            {`curl -X POST https://your-domain.com/api/v1/commercials \\
  -H "Authorization: Bearer rp_live_..." \\
  -d '{
    "source_video": "https://...",
    "brand": "Lumière",
    "length": 15,
    "aspect_ratio": "9:16",
    "provider": "seedance"
  }'`}
          </pre>
        </div>
      </div>

      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy it now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2">
            <Input
              readOnly
              value={newKey ?? ""}
              className="h-9 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (newKey) navigator.clipboard.writeText(newKey);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
