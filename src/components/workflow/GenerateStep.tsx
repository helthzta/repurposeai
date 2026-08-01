"use client";

import { Camera, Clock, Loader2, MonitorPlay, RectangleVertical, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { costForGeneration } from "@/lib/credits";
import type { AspectRatio, Quality } from "@/lib/types";

function OptionGroup<T extends string>({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  disabledValues = [],
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  disabledValues?: T[];
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => {
          const disabled = disabledValues.includes(opt.value);
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                active
                  ? "border-primary bg-accent text-accent-foreground shadow-glow"
                  : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                disabled &&
                  "cursor-not-allowed opacity-45 hover:border-border hover:text-muted-foreground",
              )}
            >
              {opt.label}
              {opt.hint && (
                <span className="ml-1.5 text-[11px] font-medium opacity-70">{opt.hint}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GenerateStep({
  projectId,
  scriptId,
  durationSeconds,
  onGenerate,
}: {
  projectId: string;
  scriptId: string;
  /** Fixed by which script variant (15s/30s) the user picked in the Script step. */
  durationSeconds: number;
  onGenerate: (generationId: string) => void;
}) {
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [quality, setQuality] = useState<Quality>("high");
  const [style, setStyle] = useState("original");
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scriptId,
          provider: "seedance",
          aspectRatio: aspect,
          quality,
          cameraStyle: style,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start generation");
      onGenerate(data.generation.id);
    } catch (err) {
      toast.error("Generation failed to start", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-10">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary shadow-card">
            <MonitorPlay className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Generation Settings</h2>
            <p className="text-xs text-muted-foreground">
              Fine-tune how your commercial is rendered
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold">
              <Clock className="h-4 w-4 text-primary" />
              Video Length
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {durationSeconds}s — set by the script version you picked
            </p>
          </div>
          <OptionGroup
            label="Aspect Ratio"
            icon={RectangleVertical}
            value={aspect}
            onChange={setAspect}
            options={[
              { value: "9:16", label: "9:16" },
              { value: "16:9", label: "16:9" },
              { value: "1:1", label: "1:1" },
            ]}
          />
          <OptionGroup
            label="Visual Quality"
            icon={Sparkles}
            value={quality}
            onChange={setQuality}
            options={[
              { value: "standard", label: "Standard" },
              { value: "high", label: "High" },
              { value: "ultra", label: "Ultra" },
            ]}
          />
          <OptionGroup
            label="Camera Style"
            icon={Camera}
            value={style}
            onChange={setStyle}
            options={[
              { value: "original", label: "Original", hint: "match uploaded video" },
              { value: "commercial", label: "Commercial" },
              { value: "luxury", label: "Luxury" },
              { value: "cinematic", label: "Cinematic" },
              { value: "product", label: "Product Focus" },
              { value: "ugc", label: "UGC" },
            ]}
          />
        </div>

        <Button
          size="lg"
          className="btn-glow mt-10 h-14 w-full rounded-2xl text-base font-bold"
          onClick={handleGenerate}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          Generate Commercial
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Uses {costForGeneration(durationSeconds, quality, aspect)} credits · Estimated 2–4 minutes
        </p>
      </div>
    </div>
  );
}
