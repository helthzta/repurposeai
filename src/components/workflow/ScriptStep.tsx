"use client";

import { ArrowRight, Loader2, MicVocal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Script } from "@/lib/types";
import { ScriptEditor } from "./ScriptEditor";

export function ScriptStep({
  scripts: initialScripts,
  originalTone,
  onBack,
  onContinue,
}: {
  /** Only a 15s variant is written for now — see the disabled 30s "Coming Soon" button below. */
  scripts: Script[];
  /** The analyzed source video's tone — same value shown on the Idea step, carried forward so it's
   * still visible while reviewing/editing the full script. */
  originalTone: string | null;
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
      {originalTone && (
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
          >
            <MicVocal className="h-3 w-3" />
            Original tone: {originalTone}
          </Badge>
        </div>
      )}
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
        {/* Native 30s generation isn't wired up yet — kept visible so it reads as roadmapped, not missing. */}
        <button
          disabled
          className="cursor-not-allowed rounded-xl border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground opacity-60"
        >
          30s version
          <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Coming Soon
          </span>
        </button>
      </div>
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
