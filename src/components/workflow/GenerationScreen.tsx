"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { generationStages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const POLL_MS = 2500;

export function GenerationScreen({
  generationId,
  onComplete,
  onRetry,
}: {
  generationId: string;
  onComplete: () => void;
  onRetry?: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, generationStages.length - 1));
    }, 4000);

    const poll = async () => {
      if (stopped.current) return;
      try {
        const res = await fetch(`/api/generations/${generationId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation status check failed");

        if (data.generation.status === "completed") {
          stopped.current = true;
          onComplete();
          return;
        }
        if (data.generation.status === "failed") {
          stopped.current = true;
          setError(data.generation.error_message ?? "Generation failed");
          return;
        }
      } catch (err) {
        stopped.current = true;
        setError(err instanceof Error ? err.message : "Generation status check failed");
        return;
      }
      setTimeout(poll, POLL_MS);
    };

    poll();

    return () => {
      stopped.current = true;
      clearInterval(stageTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationId]);

  if (error) {
    return (
      <div className="animate-fade-up mx-auto max-w-xl">
        <div className="rounded-3xl border bg-card px-6 py-14 text-center shadow-card sm:px-12">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          {onRetry && (
            <Button className="btn-glow mt-6 rounded-xl font-semibold" onClick={onRetry}>
              Back to settings
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mx-auto max-w-xl">
      <div className="rounded-3xl border bg-card px-6 py-14 text-center shadow-card sm:px-12">
        <div className="relative mx-auto w-fit">
          <div className="grid h-24 w-24 place-items-center rounded-full gradient-primary shadow-glow">
            <Sparkles className="h-10 w-10 text-primary-foreground animate-pulse-soft" />
          </div>
          <div className="absolute -inset-4 -z-10 rounded-full bg-primary/20 blur-2xl animate-pulse-soft" />
          <Loader2
            className="absolute -inset-2 h-28 w-28 text-primary/30 animate-spin-slow"
            strokeWidth={0.75}
          />
        </div>

        <h2 className="mt-8 text-xl font-extrabold tracking-tight">Creating your commercial</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">This usually takes 2–4 minutes</p>

        <ol className="mx-auto mt-10 max-w-xs space-y-3 text-left">
          {generationStages.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-all duration-300",
                    done && "bg-success text-success-foreground",
                    active && "gradient-primary text-primary-foreground",
                    !done && !active && "border bg-muted text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : done
                        ? "text-muted-foreground line-through decoration-border"
                        : "text-muted-foreground/60",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
