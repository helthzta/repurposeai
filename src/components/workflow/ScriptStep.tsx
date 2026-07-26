"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Script } from "@/lib/types";
import { ScriptEditor } from "./ScriptEditor";

export function ScriptStep({
  scripts: initialScripts,
  onBack,
  onContinue,
}: {
  /** The two duration variants (15s/30s) written for the picked idea. */
  scripts: Script[];
  onBack: () => void;
  onContinue: (script: Script) => void;
}) {
  const [scripts, setScripts] = useState(initialScripts);
  const [switching, setSwitching] = useState(false);
  const active = scripts.find((s) => s.is_selected) ?? scripts[0];

  const pick = async (target: Script) => {
    if (target.id === active.id) return;
    setSwitching(true);
    try {
      const res = await fetch(`/api/scripts/${target.id}/select`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not switch script");
      setScripts((prev) => prev.map((s) => ({ ...s, is_selected: s.id === target.id })));
    } catch (err) {
      toast.error("Couldn't switch length", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSwitching(false);
    }
  };

  const updateActive = (updated: Script) =>
    setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  return (
    <div className="animate-fade-up space-y-6">
      {scripts.length > 1 && (
        <div className="flex justify-center gap-2">
          {scripts.map((s) => (
            <button
              key={s.id}
              onClick={() => pick(s)}
              disabled={switching}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200",
                s.id === active.id
                  ? "border-primary bg-accent text-accent-foreground shadow-glow"
                  : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {switching && s.id !== active.id ? (
                <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
              ) : null}
              {s.target_duration_seconds ?? "?"}s version
            </button>
          ))}
        </div>
      )}
      <ScriptEditor
        key={active.id}
        script={active}
        onBack={onBack}
        onSync={updateActive}
        onSave={updateActive}
      />
      <div className="flex justify-end">
        <Button
          size="lg"
          className="btn-glow h-12 rounded-xl px-8 font-semibold"
          onClick={() => onContinue(active)}
        >
          Continue to Settings
          <ArrowRight className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}
