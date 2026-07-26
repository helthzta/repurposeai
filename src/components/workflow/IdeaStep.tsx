"use client";

import { ArrowRight, Loader2, Megaphone, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Script, ScriptIdea } from "@/lib/types";
import { cn } from "@/lib/utils";

const BADGE_LABEL: Record<string, string> = {
  emotional: "Emotional",
  humorous: "Humorous",
  high_conversion: "High Conversion",
};

export function IdeaStep({
  projectId,
  initialIdeas,
  onIdeasReady,
  onScriptReady,
}: {
  projectId: string;
  initialIdeas: ScriptIdea[] | null;
  onIdeasReady: (ideas: ScriptIdea[]) => void;
  onScriptReady: (script: Script) => void;
}) {
  const [ideas, setIdeas] = useState<ScriptIdea[]>(initialIdeas ?? []);
  const [loading, setLoading] = useState(!initialIdeas?.length);
  const [writing, setWriting] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (initialIdeas?.length) return; // already cached — resuming here or navigating back, don't regenerate
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch("/api/scripts/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Idea generation failed");
        setIdeas(data.ideas);
        onIdeasReady(data.ideas);
      } catch (err) {
        toast.error("Couldn't generate ideas", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const chooseIdea = async (idea: ScriptIdea, index: number) => {
    setWriting(index);
    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not write the script");
      onScriptReady(data.script);
    } catch (err) {
      toast.error("Script writing failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setWriting(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-up flex flex-col items-center rounded-3xl border bg-card px-6 py-20 shadow-card sm:py-28">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Pitching three repurposed ideas…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Pick a Direction</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Three quick concepts — pick one to write the full script.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {ideas.map((idea, i) => (
          <div
            key={i}
            className={cn(
              "hover-lift animate-fade-up flex flex-col rounded-3xl border bg-card p-6 shadow-card",
              idea.style === "high_conversion" && "border-primary/40",
            )}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <Badge
              variant="secondary"
              className={cn(
                "w-fit rounded-full px-3 py-1 text-[11px] font-bold",
                idea.style === "high_conversion" && "bg-accent text-accent-foreground",
              )}
            >
              {BADGE_LABEL[idea.style] ?? idea.style}
            </Badge>

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
              className="btn-glow mt-6 rounded-lg font-semibold"
              onClick={() => chooseIdea(idea, i)}
              disabled={writing !== null}
            >
              {writing === i ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Write Full Script
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
