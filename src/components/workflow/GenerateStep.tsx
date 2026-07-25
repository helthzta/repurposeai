"use client";

import {
  Camera,
  Clock,
  Layers,
  Loader2,
  MonitorPlay,
  RectangleVertical,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { costForGeneration } from "@/lib/credits";
import type { AspectRatio, Quality, VideoProviderName } from "@/lib/types";

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
  onGenerate,
}: {
  projectId: string;
  scriptId: string;
  onGenerate: (generationId: string) => void;
}) {
  const [provider, setProvider] = useState<VideoProviderName>("seedance");
  const [length, setLength] = useState<"15" | "30" | "custom">("15");
  const [customLength, setCustomLength] = useState(15);
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [quality, setQuality] = useState<Quality>("high");
  const [style, setStyle] = useState("commercial");
  const [submitting, setSubmitting] = useState(false);

  // 30s renders as two chained 15s clips stitched together server-side (see generation.ts)
  // since the model itself caps a single call at 15s — see SETUP.md.
  const maxDurationSeconds = provider === "seedance" ? 30 : 120;
  const durationSeconds = length === "custom" ? customLength : Number(length);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scriptId,
          provider,
          durationSeconds,
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
          <OptionGroup
            label="Select Provider"
            icon={Layers}
            value={provider}
            onChange={setProvider}
            options={[
              { value: "seedance", label: "Seedance" },
              { value: "higgsfield", label: "Higgsfield", hint: "soon" },
            ]}
            disabledValues={["higgsfield"]}
          />
          <div>
            <OptionGroup
              label="Video Length"
              icon={Clock}
              value={length}
              onChange={setLength}
              options={[
                { value: "15", label: "15 seconds" },
                { value: "30", label: "30 seconds" },
                { value: "custom", label: "Custom" },
              ]}
              disabledValues={maxDurationSeconds < 30 ? ["30"] : []}
            />
            {length === "custom" && (
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={maxDurationSeconds}
                  className="h-10 w-28 rounded-xl"
                  value={customLength}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isFinite(parsed)) return;
                    setCustomLength(Math.min(maxDurationSeconds, Math.max(5, parsed)));
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  seconds (max {maxDurationSeconds})
                </span>
              </div>
            )}
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
          Uses {costForGeneration(durationSeconds, quality, aspect)} credits · Estimated{" "}
          {durationSeconds > 15 ? "4–8" : "2–4"} minutes
        </p>
      </div>
    </div>
  );
}
