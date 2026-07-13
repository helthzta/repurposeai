import { Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { generationStages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STAGE_MS = 1600;

export function GenerationScreen({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStage((s) => {
        if (s >= generationStages.length - 1) {
          clearInterval(stageTimer);
          setTimeout(onComplete, 900);
          return s;
        }
        return s + 1;
      });
    }, STAGE_MS);
    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(100, p + 100 / ((generationStages.length * STAGE_MS) / 120)));
    }, 120);
    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  }, [onComplete]);

  const remaining = Math.max(
    0,
    Math.ceil(((100 - progress) / 100) * ((generationStages.length * STAGE_MS) / 1000)),
  );

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
        <p className="mt-1.5 text-sm text-muted-foreground">
          Estimated time remaining: ~{remaining}s
        </p>

        <div className="mx-auto mt-8 h-2 max-w-sm overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full gradient-primary transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-bold text-primary">{Math.round(progress)}%</p>

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
