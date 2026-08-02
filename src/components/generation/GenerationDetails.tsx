"use client";

import { ChevronDown, Copy } from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AiInsights } from "@/lib/types";
import { cn } from "@/lib/utils";

const INSIGHT_LABELS: { key: keyof AiInsights; label: string }[] = [
  { key: "marketing_score", label: "Marketing Score" },
  { key: "creativity_score", label: "Creativity Score" },
  { key: "brand_match_score", label: "Brand Match Score" },
  { key: "emotional_impact", label: "Emotional Impact" },
  { key: "predicted_conversion", label: "Predicted Conversion" },
];

/** The scored-bars list shown wherever a generation's AI Insights are surfaced. */
export function AiInsightsList({ insights }: { insights: AiInsights | null }) {
  if (!insights) {
    return (
      <p className="text-xs text-muted-foreground">Scoring not available for this generation.</p>
    );
  }

  return (
    <div className="space-y-5">
      {INSIGHT_LABELS.map((insight, i) => {
        const value = insights[insight.key];
        return (
          <div
            key={insight.key}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">{insight.label}</span>
              <span className={cn("font-bold", value >= 90 ? "text-success" : "text-foreground")}>
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
      })}
    </div>
  );
}

/** Collapsed-by-default card for a long block of text (prompt/script), with copy + expand. */
export function ExpandableTextCard({
  icon: Icon,
  title,
  content,
  emptyText,
  mono,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  content: string | null;
  emptyText: string;
  mono?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          <p className="truncate text-sm font-bold">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {open && content && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground"
              onClick={handleCopy}
              aria-label={`Copy ${title.toLowerCase()}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-lg px-2 text-xs"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "View"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>
      {open ? (
        <pre
          className={cn(
            "animate-fade-up mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground",
            mono ? "font-mono" : "font-sans",
          )}
        >
          {content ?? emptyText}
        </pre>
      ) : (
        <p className="mt-3 truncate text-xs text-muted-foreground">{content ?? emptyText}</p>
      )}
    </div>
  );
}
