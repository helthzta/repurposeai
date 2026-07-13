"use client";

import { Copy, KeyRound, Plug } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";

export function ApiPageClient() {
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
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
            <code className="truncate text-sm text-muted-foreground">rp_live_••••••••••••4f2a</code>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              aria-label="Copy API key"
              onClick={() => toast.success("API key copied")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            className="mt-4 rounded-xl font-semibold"
            onClick={() => toast.success("New key generated")}
          >
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
            {`curl -X POST https://api.repurpose.ai/v1/commercials \\
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
    </AppShell>
  );
}
