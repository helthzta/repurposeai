import {
  ArrowLeft,
  Clapperboard,
  Laugh,
  Lightbulb,
  Megaphone,
  MinusCircle,
  PlusCircle,
  Redo2,
  RefreshCw,
  Save,
  Sparkles,
  Undo2,
  Gem,
  HeartHandshake,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ScriptVersion } from "@/lib/mock-data";

const quickActions = [
  { label: "Make Funnier", icon: Laugh },
  { label: "More Emotional", icon: HeartHandshake },
  { label: "Luxury Brand Tone", icon: Gem },
  { label: "Shorter", icon: MinusCircle },
  { label: "Longer", icon: PlusCircle },
  { label: "Change CTA", icon: Megaphone },
  { label: "Add Humor", icon: Laugh },
  { label: "More Cinematic", icon: Clapperboard },
];

const suggestions = [
  "Open with the product in motion — moving hooks retain 23% more viewers.",
  "Your CTA could add urgency: try \"tonight only\" phrasing.",
  "Consider a 2-second silent beat before the reveal for emotional impact.",
];

export function ScriptEditor({
  script,
  onBack,
  onSave,
}: {
  script: ScriptVersion;
  onBack: () => void;
  onSave: (script: ScriptVersion) => void;
}) {
  const [text, setText] = useState(script.script);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  const pushHistory = (next: string) => {
    setHistory((h) => [...h, text]);
    setFuture([]);
    setText(next);
  };

  const undo = () => {
    if (!history.length) return;
    setFuture((f) => [text, ...f]);
    setText(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  };

  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, text]);
    setText(future[0]);
    setFuture((f) => f.slice(1));
  };

  const applyAction = (label: string) => {
    pushHistory(text + `\n\n[AI · ${label}] Suggested revision applied to pacing and tone.`);
    toast.success(label, { description: "AI updated your script" });
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="icon" className="shrink-0 rounded-xl" onClick={onBack} aria-label="Back to scripts">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold">Editing · {script.title}</h2>
            <p className="truncate text-xs text-muted-foreground">Changes are saved as a new version</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={undo} disabled={!history.length} aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={redo} disabled={!future.length} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button className="btn-glow rounded-xl font-semibold" onClick={() => onSave({ ...script, script: text })}>
            <Save className="h-4 w-4" />
            Save Version
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Writing area */}
        <div className="rounded-3xl border bg-card p-5 shadow-card sm:p-6">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[26rem] resize-none rounded-xl border-0 bg-muted/40 p-5 font-sans text-sm leading-7 shadow-none focus-visible:ring-1"
          />
        </div>

        {/* AI assistant panel */}
        <div className="space-y-5">
          <div className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </span>
              <h3 className="text-sm font-bold">AI Assistant</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="justify-start rounded-lg text-xs"
                  onClick={() => applyAction(action.label)}
                >
                  <action.icon className="h-3.5 w-3.5 text-primary" />
                  {action.label}
                </Button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full rounded-lg font-semibold"
              onClick={() => applyAction("Regenerate")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-bold">Live Suggestions</h3>
            </div>
            <ul className="mt-3 space-y-2.5">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="animate-fade-up rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
