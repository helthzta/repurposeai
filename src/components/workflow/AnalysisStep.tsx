"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { VideoAnalysis } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  company: "Company",
  company_does: "What They Do",
  duration_seconds: "Duration",
  viral_factor: "Why It Went Viral",
  hook: "Hook",
  pain_point: "Pain",
  context: "Context",
  emotional_trigger: "Emotion",
  audience: "Audience",
  relief: "Relief",
  hero: "Hero",
  language: "Language",
  video_metrics: "Pacing",
  visual_style: "Visual Style",
  tone_of_voice: "Tone",
};

export function AnalysisStep({
  projectId,
  onContinue,
}: {
  projectId: string;
  onContinue: () => void;
}) {
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");
        setAnalysis(data.analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
        toast.error("Analysis failed", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    })();
  }, [projectId]);

  if (error) {
    return (
      <div className="animate-fade-up rounded-3xl border bg-card px-6 py-20 text-center shadow-card">
        <p className="text-sm font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="animate-fade-up flex flex-col items-center rounded-3xl border bg-card px-6 py-20 shadow-card sm:py-28">
        <div className="relative">
          <div className="grid h-20 w-20 place-items-center rounded-3xl gradient-primary shadow-glow">
            <Sparkles className="h-9 w-9 text-primary-foreground animate-pulse-soft" />
          </div>
          <div className="absolute -inset-3 -z-10 rounded-full bg-primary/15 blur-2xl animate-pulse-soft" />
        </div>
        <h2 className="mt-8 text-lg font-bold tracking-tight sm:text-xl">AI is watching your ad</h2>
        <p className="mt-1.5 text-sm text-muted-foreground animate-pulse-soft">
          Extracting hook, structure, emotion and strategy…
        </p>
      </div>
    );
  }

  const cards = Object.entries(FIELD_LABELS)
    .map(([key, label]) => ({ label, value: analysis[key as keyof VideoAnalysis] }))
    .filter((card) => card.value !== null && card.value !== undefined && card.value !== "");

  return (
    <div className="animate-fade-up space-y-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-success/15">
          <Sparkles className="h-4 w-4 text-success" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold">Analysis complete</h2>
          <p className="text-xs text-muted-foreground">Here's what makes this ad work</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="hover-lift animate-fade-up rounded-2xl border bg-card p-5 shadow-card"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {card.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{String(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          className="btn-glow h-12 rounded-xl px-8 font-semibold"
          onClick={onContinue}
        >
          Get Script Ideas
          <ArrowRight className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}
