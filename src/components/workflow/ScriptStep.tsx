"use client";

import { Clock, Eye, Heart, Loader2, Megaphone, PenLine, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Script } from "@/lib/types";
import { ScriptEditor } from "./ScriptEditor";
import { cn } from "@/lib/utils";

const BADGE_LABEL: Record<string, string> = {
  emotional: "Emotional",
  humorous: "Humorous",
  high_conversion: "High Conversion",
  custom: "Custom",
};

export function ScriptStep({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (script: Script) => void;
}) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Script | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch("/api/scripts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Script generation failed");
        setScripts(data.scripts);
      } catch (err) {
        toast.error("Couldn't generate scripts", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const handleSelect = async (script: Script) => {
    setSelecting(script.id);
    try {
      const res = await fetch(`/api/scripts/${script.id}/select`, { method: "POST" });
      if (!res.ok) throw new Error("Could not select this script");
      onSelect(script);
    } catch (err) {
      toast.error("Selection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSelecting(null);
    }
  };

  if (editing) {
    return (
      <ScriptEditor
        script={editing}
        onBack={() => setEditing(null)}
        onSync={(updated) =>
          setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        }
        onSave={(updated) => {
          setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          setEditing(null);
          toast.success("Version saved");
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-up flex flex-col items-center rounded-3xl border bg-card px-6 py-20 shadow-card sm:py-28">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Writing three repurposed scripts…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          Choose Your Repurposed Script
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Three directions, one winning strategy — pick the voice that fits your brand.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {scripts.map((script, i) => (
          <div
            key={script.id}
            className={cn(
              "hover-lift animate-fade-up flex flex-col rounded-3xl border bg-card p-6 shadow-card",
              script.style === "high_conversion" && "border-primary/40",
            )}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-bold",
                  script.style === "high_conversion" && "bg-accent text-accent-foreground",
                )}
              >
                {BADGE_LABEL[script.style] ?? script.style}
              </Badge>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {script.estimated_duration}
              </span>
            </div>

            <h3 className="mt-4 text-[15px] font-bold">{script.title}</h3>

            <div className="mt-3 rounded-xl bg-accent/60 p-3.5">
              <p className="flex items-start gap-2 text-[13px] font-medium leading-relaxed text-accent-foreground">
                <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {script.hook}
              </p>
            </div>

            <pre className="mt-4 max-h-44 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3.5 font-sans text-xs leading-relaxed text-muted-foreground">
              {script.body}
            </pre>

            <div className="mt-4 space-y-2 text-xs">
              <p className="flex items-center gap-2 font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                CTA: <span className="text-foreground">{script.cta}</span>
              </p>
              <p className="flex items-center gap-2 font-medium text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-primary" />
                {script.emotional_direction}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => toast.info("Preview", { description: script.hook ?? undefined })}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setEditing(script)}
              >
                <PenLine className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                className="btn-glow rounded-lg font-semibold"
                onClick={() => handleSelect(script)}
                disabled={selecting === script.id}
              >
                {selecting === script.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Select"
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
