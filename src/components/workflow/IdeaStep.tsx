"use client";

import { ArrowRight, Copy, Loader2, Megaphone, MicVocal, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { Script, ScriptIdea } from "@/lib/types";
import { cn } from "@/lib/utils";

const BADGE_LABEL: Record<string, string> = {
  emotional: "Repurposed — Emotional",
  humorous: "Repurposed — Humorous",
  high_conversion: "Repurposed — High Conversion",
  reclone: "Recreated",
  custom: "Your Idea",
};

const BADGE_STAGE: Record<string, string> = {
  emotional: "Stage 1",
  humorous: "Stage 2",
  high_conversion: "Stage 2",
  reclone: "Stage 1 — Recreated",
  custom: "",
};

export function IdeaStep({
  projectId,
  initialIdeas,
  originalTone,
  onIdeasReady,
  onScriptsReady,
}: {
  projectId: string;
  initialIdeas: ScriptIdea[] | null;
  /** The analyzed source video's tone — null if analysis hasn't run yet or didn't detect one. */
  originalTone: string | null;
  onIdeasReady: (ideas: ScriptIdea[]) => void;
  onScriptsReady: (scripts: Script[]) => void;
}) {
  const [ideas, setIdeas] = useState<ScriptIdea[]>(initialIdeas ?? []);
  const [loading, setLoading] = useState(!initialIdeas?.length);
  const [regenerating, setRegenerating] = useState(false);
  const [writing, setWriting] = useState<number | "custom" | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customPitch, setCustomPitch] = useState("");
  const started = useRef(false);

  const generateIdeas = async (preserveReclone = false) => {
    const res = await fetch("/api/scripts/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, preserveReclone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Idea generation failed");
    setIdeas(data.ideas);
    onIdeasReady(data.ideas);
  };

  useEffect(() => {
    if (initialIdeas?.length) return; // already cached — resuming here or navigating back, don't regenerate
    if (started.current) return;
    started.current = true;

    generateIdeas(false)
      .catch((err) => {
        toast.error("Couldn't generate ideas", {
          description: err instanceof Error ? err.message : undefined,
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      // Preserve the reclone idea — only the 2 repurposed ideas are regenerated
      const hasReclone = ideas.some((idea) => idea.style === "reclone");
      await generateIdeas(hasReclone);
      toast.success("New repurposed ideas ready");
    } catch (err) {
      toast.error("Couldn't regenerate ideas", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRegenerating(false);
    }
  };

  const chooseIdea = async (idea: ScriptIdea, key: number | "custom") => {
    setWriting(key);
    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not write the script");
      onScriptsReady(data.scripts);
    } catch (err) {
      toast.error("Script writing failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setWriting(null);
    }
  };

  const submitCustomIdea = () => {
    const pitch = customPitch.trim();
    if (!pitch) return;
    chooseIdea({ style: "custom", title: "Your Idea", hook: pitch, pitch }, "custom");
  };

  if (loading) {
    return (
      <div className="animate-fade-up flex flex-col items-center rounded-3xl border bg-card px-6 py-20 shadow-card sm:py-28">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Pitching repurposed ideas + reclone…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Pick a Direction</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          2 repurposed concepts + 1 recreated clone — pick one to write the full script.
        </p>
        {originalTone && (
          <Badge
            variant="secondary"
            className="mt-3 gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
          >
            <MicVocal className="h-3 w-3" />
            Original tone: {originalTone}
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-lg text-xs"
          onClick={handleRegenerate}
          disabled={regenerating || writing !== null}
        >
          {regenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Regenerate Repurposed Ideas
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">
          (Regenerating only changes the 2 repurposed ideas — the Recreated clone stays the same)
        </p>
      </div>

      <div className={cn("mt-8 grid gap-5 lg:grid-cols-3", regenerating && "opacity-50")}>
        {ideas.map((idea, i) => {
          const isReclone = idea.style === "reclone";
          return (
            <div
              key={i}
              className={cn(
                "hover-lift animate-fade-up flex flex-col rounded-3xl border bg-card p-6 shadow-card",
                idea.style === "high_conversion" && !isReclone && "border-primary/40",
                isReclone && "border-amber-500/30 bg-amber-500/5",
              )}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "w-fit rounded-full px-3 py-1 text-[11px] font-bold",
                    idea.style === "high_conversion" && !isReclone && "bg-accent text-accent-foreground",
                    isReclone && "bg-amber-500/20 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {isReclone ? <Copy className="mr-1 h-2.5 w-2.5" /> : null}
                  {BADGE_LABEL[idea.style] ?? idea.style}
                </Badge>
                {BADGE_STAGE[idea.style] && (
                  <span className="text-[10px] font-medium text-muted-foreground/60">
                    {BADGE_STAGE[idea.style]}
                  </span>
                )}
              </div>

              {isReclone && (
                <p className="mt-2 text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">
                  Shot-for-shot structural clone · swaps brand only
                </p>
              )}

              <h3 className="mt-4 text-[15px] font-bold">{idea.title}</h3>

              <div className="mt-3 rounded-xl bg-accent/60 p-3.5">
                <p className="flex items-start gap-2 text-[13px] font-medium leading-relaxed text-accent-foreground">
                  <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {idea.hook}
                </p>
              </div>

              <p className="mt-4 flex-1 text-xs leading-relaxed text-muted-foreground">
                {idea.pitch}
              </p>

              <Button
                className={cn(
                  "mt-6 rounded-lg font-semibold",
                  isReclone
                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                    : "btn-glow",
                )}
                onClick={() => chooseIdea(idea, i)}
                disabled={writing !== null}
              >
                {writing === i ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isReclone ? (
                  <Copy className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isReclone ? "Write Reclone Script" : "Write Full Scripts"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 animate-fade-up rounded-3xl border border-dashed bg-card/50 p-6">
        {showCustomForm ? (
          <div className="flex flex-col gap-3">
            <Textarea
              autoFocus
              placeholder="Describe your own idea for the script — a hook, an angle, a story beat, anything…"
              value={customPitch}
              onChange={(e) => setCustomPitch(e.target.value)}
              disabled={writing !== null}
              className="min-h-24 rounded-xl"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomPitch("");
                }}
                disabled={writing !== null}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="btn-glow rounded-lg text-xs font-semibold"
                onClick={submitCustomIdea}
                disabled={writing !== null || !customPitch.trim()}
              >
                {writing === "custom" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Write Full Script
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            disabled={writing !== null}
            className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Your Own Idea
          </button>
        )}
      </div>
    </div>
  );
}
