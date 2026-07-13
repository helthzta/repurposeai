import { Clock, Eye, Heart, Megaphone, PenLine, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scriptVersions, type ScriptVersion } from "@/lib/mock-data";
import { ScriptEditor } from "./ScriptEditor";
import { cn } from "@/lib/utils";

export function ScriptStep({ onSelect }: { onSelect: (script: ScriptVersion) => void }) {
  const [editing, setEditing] = useState<ScriptVersion | null>(null);
  const [scripts, setScripts] = useState(scriptVersions);

  if (editing) {
    return (
      <ScriptEditor
        script={editing}
        onBack={() => setEditing(null)}
        onSave={(updated) => {
          setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          setEditing(null);
          toast.success("Version saved");
        }}
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          Choose Your Repurposed Script
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Three directions, one winning strategy — pick the voice that fits your brand.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {scripts.map((script, i) => (
          <div
            key={script.id}
            className={cn(
              "hover-lift animate-fade-up flex flex-col rounded-3xl border bg-card p-6 shadow-card",
              i === 2 && "border-primary/40",
            )}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-bold",
                  script.id === "conversion" && "bg-accent text-accent-foreground",
                )}
              >
                {script.badge}
              </Badge>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {script.duration}
              </span>
            </div>

            <h3 className="mt-4 text-[15px] font-bold">{script.title}</h3>

            <div className="mt-3 rounded-xl bg-accent/60 p-3.5">
              <p className="flex items-start gap-2 text-[13px] font-medium leading-relaxed text-accent-foreground">
                <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {script.hook}
              </p>
            </div>

            <pre className="mt-4 max-h-44 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3.5 font-sans text-xs leading-relaxed text-muted-foreground">
              {script.script}
            </pre>

            <div className="mt-4 space-y-2 text-xs">
              <p className="flex items-center gap-2 font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                CTA: <span className="text-foreground">{script.cta}</span>
              </p>
              <p className="flex items-center gap-2 font-medium text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-primary" />
                {script.emotion}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => toast.info("Preview", { description: script.hook })}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setEditing(script)}
              >
                <PenLine className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                className="btn-glow rounded-lg font-semibold"
                onClick={() => onSelect(script)}
              >
                Select
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
