import {
  Copy,
  Download,
  FileText,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aiInsights, type ScriptVersion } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const thumbPerfume = "/thumb-perfume.jpg";

const PROMPT = `Cinematic 9:16 luxury perfume commercial, 28s. Golden-hour city apartment, slow push-in on woman at window. Macro fragrance mist in slow motion, warm-cool contrast, shallow DOF. Product hero shot on marble with soft glow. Mood: quiet luxury, self-assurance. End card: "Find the scent that remembers you."`;

export function ResultStep({
  script,
  onRegenerate,
}: {
  script: ScriptVersion | null;
  onRegenerate: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showScript, setShowScript] = useState(false);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Player + actions */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
            <div className="relative mx-auto aspect-[9/16] max-h-[34rem] w-full max-w-sm">
              <img
                src={thumbPerfume}
                alt="Generated AI commercial for Lumière Fragrance"
                width={768}
                height={1152}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <button
                className="absolute inset-0 grid place-items-center bg-foreground/20 transition-colors hover:bg-foreground/30"
                aria-label="Play generated commercial"
                onClick={() => toast.info("Playing preview")}
              >
                <span className="grid h-16 w-16 place-items-center rounded-full glass shadow-lift hover-lift">
                  <Play className="h-7 w-7 text-primary" fill="currentColor" />
                </span>
              </button>
              <span className="absolute left-4 top-4 rounded-full bg-success px-3 py-1 text-[11px] font-bold text-success-foreground">
                Ready
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Button
              className="btn-glow rounded-xl font-semibold"
              onClick={() => toast.success("Download started")}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" className="rounded-xl font-semibold" onClick={onRegenerate}>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button variant="outline" className="rounded-xl font-semibold" onClick={onRegenerate}>
              <Copy className="h-4 w-4" />
              Variation
            </Button>
            <Button
              variant="outline"
              className="rounded-xl font-semibold"
              onClick={() => toast.success("Share link copied")}
            >
              <Share2 className="h-4 w-4" />
              Share
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
                  {PROMPT}
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
                  {script?.script ?? "No script selected."}
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
            {aiInsights.map((insight, i) => (
              <div
                key={insight.label}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">{insight.label}</span>
                  <span
                    className={cn(
                      "font-bold",
                      insight.value >= 90 ? "text-success" : "text-foreground",
                    )}
                  >
                    {insight.value}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      insight.value >= 90 ? "bg-success" : "gradient-primary",
                    )}
                    style={{ width: `${insight.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-xl bg-accent/60 p-4 text-xs leading-relaxed text-accent-foreground">
            This commercial closely matches your brand tone and is predicted to outperform the
            original ad's hook retention by 18%.
          </div>
        </div>
      </div>
    </div>
  );
}
