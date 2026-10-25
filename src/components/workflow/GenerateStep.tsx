"use client";

import {
  ArrowLeft,
  Camera,
  Clock,
  Languages,
  Loader2,
  MonitorPlay,
  RectangleVertical,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePricing } from "@/hooks/use-pricing";
import { rateFor } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  QUALITY_LABELS,
  SCRIPT_LANGUAGE_LABELS,
  type AspectRatio,
  type Quality,
  type Script,
  type ScriptLanguage,
} from "@/lib/types";

function OptionGroup<T extends string>({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-primary bg-accent text-accent-foreground shadow-glow"
                  : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
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
  scripts: initialScripts,
  onBack,
  onGenerate,
}: {
  projectId: string;
  /** The 15s and 30s variants written for the picked idea — the length picker switches between them. */
  scripts: Script[];
  /** Back to the Ideas step. */
  onBack: () => void;
  onGenerate: (generationId: string, script: Script) => void;
}) {
  const [scripts, setScripts] = useState(initialScripts);
  const active = scripts.find((s) => s.is_selected) ?? scripts[0];
  const durationSeconds = active.target_duration_seconds ?? 15;
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [quality, setQuality] = useState<Quality>("high");
  const [style, setStyle] = useState("original");
  const [busy, setBusy] = useState<"length" | "script" | "submit" | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const { data: pricing } = usePricing();
  const rate = pricing ? rateFor(pricing.rates, durationSeconds, quality) : null;

  const pickLength = async (target: Script) => {
    if (target.id === active.id) return;
    setBusy("length");
    try {
      const res = await fetch(`/api/scripts/${target.id}/select`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not switch length");
      setScripts((prev) => prev.map((s) => ({ ...s, is_selected: s.id === target.id })));
    } catch (err) {
      toast.error("Couldn't switch length", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  // Changing language or subtitles re-writes this script's body from scratch through the same
  // structured prompt as first-time generation — never a translation-in-place of the old text.
  const updateScript = async (patch: { language?: ScriptLanguage; subtitles?: boolean }) => {
    setBusy("script");
    try {
      const res = await fetch(`/api/scripts/${active.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the script");
      setScripts((prev) => prev.map((s) => (s.id === data.script.id ? data.script : s)));
      toast.success("Script updated");
    } catch (err) {
      toast.error("Couldn't update script", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleGenerate = async () => {
    setBusy("submit");
    setInsufficientCredits(false);
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scriptId: active.id,
          provider: "seedance",
          aspectRatio: aspect,
          quality,
          cameraStyle: style,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setInsufficientCredits(true);
        toast.error("Not enough credits", {
          description: "Choose a plan to keep generating.",
          action: {
            label: "View plans",
            onClick: () => window.open("/credits", "_blank", "noopener"),
          },
          duration: 8000,
        });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not start generation");
      onGenerate(data.generation.id, active);
    } catch (err) {
      toast.error("Generation failed to start", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-10">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl"
            onClick={onBack}
            aria-label="Back to ideas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
            <MonitorPlay className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">Generation Settings</h2>
            <p className="truncate text-xs text-muted-foreground">{active.title}</p>
          </div>
        </div>

        {insufficientCredits && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <ShoppingCart className="h-4 w-4 shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">
              Not enough credits for this generation.
            </p>
            <Button
              size="sm"
              className="btn-glow rounded-xl font-semibold"
              onClick={() => window.open("/credits", "_blank", "noopener")}
            >
              View plans
            </Button>
          </div>
        )}

        <div className="mt-8 space-y-8">
          <OptionGroup
            label="Video Length"
            icon={Clock}
            value={active.id}
            onChange={(id) => {
              const target = scripts.find((s) => s.id === id);
              if (target) void pickLength(target);
            }}
            disabled={busy !== null}
            options={scripts.map((s) => ({
              value: s.id,
              label: `${s.target_duration_seconds ?? "?"}s`,
            }))}
          />

          <div>
            <p className="flex items-center gap-2 text-sm font-bold">
              <Languages className="h-4 w-4 text-primary" />
              Script
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="script-language"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Language
                </Label>
                <Select
                  value={active.language}
                  onValueChange={(value) => updateScript({ language: value as ScriptLanguage })}
                  disabled={busy !== null}
                >
                  <SelectTrigger id="script-language" className="h-9 w-32 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SCRIPT_LANGUAGE_LABELS) as ScriptLanguage[]).map((code) => (
                      <SelectItem key={code} value={code}>
                        {SCRIPT_LANGUAGE_LABELS[code]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="script-subtitles"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Subtitles
                </Label>
                <Switch
                  id="script-subtitles"
                  checked={active.subtitles}
                  onCheckedChange={(checked) => updateScript({ subtitles: checked })}
                  disabled={busy !== null}
                />
              </div>
              {busy === "script" && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Rewriting script…
                </span>
              )}
            </div>
          </div>

          <OptionGroup
            label="Aspect Ratio"
            icon={RectangleVertical}
            value={aspect}
            onChange={setAspect}
            options={[
              { value: "9:16", label: "9:16", hint: "Reels · TikTok" },
              { value: "16:9", label: "16:9", hint: "YouTube" },
            ]}
          />
          <OptionGroup
            label="Visual Quality"
            icon={Sparkles}
            value={quality}
            onChange={setQuality}
            options={(["high", "ultra"] as const).map((q) => {
              const r = pricing ? rateFor(pricing.rates, durationSeconds, q) : null;
              return {
                value: q,
                label: QUALITY_LABELS[q],
                hint: r ? `${r.credits} credits` : undefined,
              };
            })}
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
          disabled={busy !== null || !rate}
        >
          {busy === "submit" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          Generate Commercial
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {rate ? `Uses ${rate.credits} credits` : "Loading price…"} · Estimated 2–4 minutes
        </p>
      </div>
    </div>
  );
}
