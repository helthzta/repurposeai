import {
  ArrowLeft,
  Clapperboard,
  Laugh,
  Loader2,
  Megaphone,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Save,
  Sparkles,
  Gem,
  HeartHandshake,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Script } from "@/lib/types";

const quickActions = [
  { label: "Make Funnier", icon: Laugh },
  { label: "More Emotional", icon: HeartHandshake },
  { label: "Luxury Brand Tone", icon: Gem },
  { label: "Shorter", icon: MinusCircle },
  { label: "Longer", icon: PlusCircle },
  { label: "Change CTA", icon: Megaphone },
  { label: "More Cinematic", icon: Clapperboard },
];

/** Imperative escape hatch for ScriptStep's "Continue" button — see saveIfDirty below. */
export interface ScriptEditorHandle {
  /** Persists any unsaved textarea edits before leaving this step. No-op (and no network call)
   * if the textarea still matches what's already saved. Returns the script to continue with. */
  saveIfDirty: () => Promise<Script>;
}

export const ScriptEditor = forwardRef<
  ScriptEditorHandle,
  {
    script: Script;
    onBack: () => void;
    onSync: (script: Script) => void;
    onSave: (script: Script) => void;
  }
>(function ScriptEditor({ script, onBack, onSync, onSave }, ref) {
  const [text, setText] = useState(script.body);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  // script.body can change from outside this component (ScriptStep's Language/Subtitles
  // controls regenerate the body and update the prop) without script.id changing, so no
  // remount happens — resync local text whenever the underlying body actually changes.
  useEffect(() => {
    setText(script.body);
  }, [script.body]);

  const applyAction = async (label: string, instruction: string) => {
    setApplying(label);
    try {
      const res = await fetch(`/api/scripts/${script.id}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI edit failed");
      setText(data.script.body);
      // The assist route already persisted this to the DB — keep the parent's
      // list state in sync now, not just when "Save Version" is clicked, so
      // "Back" without an explicit save doesn't leave stale text on the card.
      onSync(data.script);
      toast.success(label, { description: "AI updated your script" });
    } catch (err) {
      toast.error("AI edit failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApplying(null);
    }
  };

  // A from-scratch rewrite — unlike the quick actions above, this goes through the same
  // structured script prompt as first-time generation (not the free-text /assist edit path),
  // so a regenerate can never come back in a different format than the original.
  const handleRegenerate = async () => {
    setApplying("Regenerate");
    try {
      const res = await fetch(`/api/scripts/${script.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Regenerate failed");
      setText(data.script.body);
      onSync(data.script);
      toast.success("Regenerate", { description: "Wrote a fresh version of this script" });
    } catch (err) {
      toast.error("Regenerate failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApplying(null);
    }
  };

  const persistBody = async (): Promise<Script> => {
    const res = await fetch(`/api/scripts/${script.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    onSave(data.script);
    return data.script;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistBody();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  // Lets ScriptStep's "Continue to Settings" flush unsaved textarea edits before generation
  // reads this script from the DB — without this, typing a change and continuing without an
  // explicit "Save Version" would silently generate from the old, still-persisted body, so the
  // "final" script shown in the editor could drift from the one actually used to render the video.
  useImperativeHandle(ref, () => ({
    saveIfDirty: () => (text === script.body ? Promise.resolve(script) : persistBody()),
  }));

  return (
    <div className="animate-fade-up">
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl"
            onClick={onBack}
            aria-label="Back to scripts"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold">Editing · {script.title}</h2>
            <p className="truncate text-xs text-muted-foreground">
              Changes are saved to this version
            </p>
          </div>
        </div>
        <Button
          className="btn-glow rounded-xl font-semibold"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Version
        </Button>
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
                  onClick={() => applyAction(action.label, action.label)}
                  disabled={applying !== null}
                >
                  {applying === action.label ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <action.icon className="h-3.5 w-3.5 text-primary" />
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full rounded-lg font-semibold"
              onClick={handleRegenerate}
              disabled={applying !== null}
            >
              {applying === "Regenerate" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
