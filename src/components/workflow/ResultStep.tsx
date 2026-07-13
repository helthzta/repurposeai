"use client";

import { Copy, Download, FileText, Loader2, RefreshCw, Sparkles, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AiInsights, Generation, Script } from "@/lib/types";
import { cn } from "@/lib/utils";

const INSIGHT_LABELS: { key: keyof AiInsights; label: string }[] = [
  { key: "marketing_score", label: "Marketing Score" },
  { key: "creativity_score", label: "Creativity Score" },
  { key: "brand_match_score", label: "Brand Match Score" },
  { key: "emotional_impact", label: "Emotional Impact" },
  { key: "predicted_conversion", label: "Predicted Conversion" },
];

export function ResultStep({
  generationId,
  script,
  onRegenerate,
}: {
  generationId: string;
  script: Script | null;
  onRegenerate: (newGenerationId: string) => void;
}) {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [regenerating, setRegenerating] = useState<"regenerate" | "variation" | null>(null);

  useEffect(() => {
    fetch(`/api/generations/${generationId}`)
      .then((res) => res.json())
      .then((data) => setGeneration(data.generation))
      .catch(() => toast.error("Could not load the generated commercial"));
  }, [generationId]);

  const handleRegenerate = async (kind: "regenerate" | "variation") => {
    setRegenerating(kind);
    try {
      const res = await fetch(`/api/generations/${generationId}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not regenerate");
      onRegenerate(data.generation.id);
    } catch (err) {
      toast.error("Regenerate failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Player + actions */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
            <div className="relative mx-auto aspect-[9/16] max-h-[34rem] w-full max-w-sm bg-muted">
              {generation?.output_url ? (
                <video
                  src={generation.output_url}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  {generation ? "No preview available for this provider yet" : "Loading…"}
                </div>
              )}
              <span className="absolute left-4 top-4 rounded-full bg-success px-3 py-1 text-[11px] font-bold text-success-foreground">
                {generation?.status === "completed" ? "Ready" : "Processing"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Button
              className="btn-glow rounded-xl font-semibold"
              disabled={!generation?.output_url}
              asChild={!!generation?.output_url}
            >
              {generation?.output_url ? (
                <a href={generation.output_url} download>
                  <Download className="h-4 w-4" />
                  Download
                </a>
              ) : (
                <span>
                  <Download className="h-4 w-4" />
                  Download
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl font-semibold"
              onClick={() => handleRegenerate("regenerate")}
              disabled={regenerating !== null}
            >
              {regenerating === "regenerate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate
            </Button>
            <Button
              variant="outline"
              className="rounded-xl font-semibold"
              onClick={() => handleRegenerate("variation")}
              disabled={regenerating !== null}
            >
              {regenerating === "variation" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Variation
            </Button>
          </div>

          {/* Prompt & script */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Terminal className="h-4 w-4 text-primary" />
                  Prompt Used
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => setShowPrompt(!showPrompt)}
                >
                  {showPrompt ? "Hide" : "View Prompt"}
                </Button>
              </div>
              {showPrompt && (
                <p className="animate-fade-up mt-3 rounded-xl bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
                  {generation?.prompt_used ?? "No prompt recorded."}
                </p>
              )}
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <FileText className="h-4 w-4 text-primary" />
                  Script Used
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => setShowScript(!showScript)}
                >
                  {showScript ? "Hide" : "View Script"}
                </Button>
              </div>
              {showScript && (
                <pre className="animate-fade-up mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3.5 font-sans text-xs leading-relaxed text-muted-foreground">
                  {script?.body ?? "No script selected."}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="h-fit rounded-3xl border bg-card p-6 shadow-card lg:sticky lg:top-24">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
              <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
            </span>
            <h3 className="text-[15px] font-bold">AI Insights</h3>
          </div>
          <div className="mt-6 space-y-5">
            {generation?.ai_insights ? (
              INSIGHT_LABELS.map((insight, i) => {
                const value = generation.ai_insights![insight.key];
                return (
                  <div
                    key={insight.key}
                    className="animate-fade-up"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-muted-foreground">{insight.label}</span>
                      <span
                        className={cn(
                          "font-bold",
                          value >= 90 ? "text-success" : "text-foreground",
                        )}
                      >
                        {Math.round(value)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          value >= 90 ? "bg-success" : "gradient-primary",
                        )}
                        style={{ width: `${Math.min(100, value)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">
                Scoring not available for this generation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
