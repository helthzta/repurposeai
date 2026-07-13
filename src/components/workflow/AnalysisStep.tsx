import { ArrowRight, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { analysisCards } from "@/lib/mock-data";

const thumbPerfume = "/thumb-perfume.jpg";

export function AnalysisStep({ onContinue }: { onContinue: () => void }) {
  const [progress, setProgress] = useState(0);
  const done = progress >= 100;

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(100, p + Math.random() * 9 + 3);
      });
    }, 180);
    return () => clearInterval(timer);
  }, []);

  if (!done) {
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
        <div className="mt-8 w-full max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2.5 text-center text-sm font-bold text-primary">
            {Math.round(progress)}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Analysis cards */}
        <div>
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
            {analysisCards.map((card, i) => (
              <div
                key={card.label}
                className="hover-lift animate-fade-up rounded-2xl border bg-card p-5 shadow-card"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {card.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Video preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <div className="relative aspect-[9/16] max-h-[28rem] w-full">
              <img
                src={thumbPerfume}
                alt="Uploaded competitor ad preview"
                width={768}
                height={1152}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <button
                className="absolute inset-0 grid place-items-center bg-foreground/20 transition-colors hover:bg-foreground/30"
                aria-label="Play uploaded ad"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full glass shadow-lift">
                  <Play className="h-6 w-6 text-primary" fill="currentColor" />
                </span>
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold">competitor-ad.mp4</p>
              <p className="text-xs text-muted-foreground">0:27 · 1080×1920</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          className="btn-glow h-12 rounded-xl px-8 font-semibold"
          onClick={onContinue}
        >
          Generate Scripts
          <ArrowRight className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}
