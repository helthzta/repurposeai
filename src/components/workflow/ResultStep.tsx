"use client";

import { Copy, Download, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiInsightsList, ExpandableTextCard } from "@/components/generation/GenerationDetails";
import type { Generation, Script } from "@/lib/types";
import { downloadFile } from "@/lib/utils";

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
  const [regenerating, setRegenerating] = useState<"regenerate" | "variation" | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!generation?.output_url) return;
    setDownloading(true);
    try {
      await downloadFile(generation.output_url, `${generation.id}.mp4`);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    fetch(`/api/generations/${generationId}`)
      .then((res) => res.json())
      .then((data) => setGeneration(data.generation))
      .catch(() => toast.error("Could not load the generated commercial"));
  }, [generationId]);

  const handleRegenerate = async (kind: "regenerate" | "variation") => {
    setRegenerating(kind);
    try {
      const res = await fetch(`/api/generations/${generationId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variation: kind === "variation" }),
      });
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
              disabled={!generation?.output_url || downloading}
              onClick={handleDownload}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
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

          {/* Script */}
          <ExpandableTextCard
            icon={FileText}
            title="Script Used"
            content={script?.body ?? null}
            emptyText="No script selected."
          />
        </div>

        {/* AI Insights */}
        <div className="h-fit rounded-3xl border bg-card p-6 shadow-card lg:sticky lg:top-24">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
              <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
            </span>
            <h3 className="text-[15px] font-bold">AI Insights</h3>
          </div>
          <div className="mt-6">
            <AiInsightsList insights={generation?.ai_insights ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}
