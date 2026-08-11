"use client";

import { ArrowRight, Loader2, MicVocal } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SCRIPT_LANGUAGE_LABELS, type Script, type ScriptLanguage } from "@/lib/types";
import { ScriptEditor, type ScriptEditorHandle } from "./ScriptEditor";

export function ScriptStep({
  scripts: initialScripts,
  originalTone,
  onBack,
  onContinue,
}: {
  /** The 15s and 30s variants written for the picked idea — switching between them is instant. */
  scripts: Script[];
  /** The analyzed source video's tone — same value shown on the Idea step, carried forward so it's
   * still visible while reviewing/editing the full script. */
  originalTone: string | null;
  onBack: () => void;
  onContinue: (script: Script) => void;
}) {
  const [scripts, setScripts] = useState(initialScripts);
  const [switching, setSwitching] = useState(false);
  const [applyingSettings, setApplyingSettings] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const active = scripts.find((s) => s.is_selected) ?? scripts[0];
  const editorRef = useRef<ScriptEditorHandle>(null);

  const pick = async (target: Script) => {
    if (target.id === active.id) return;
    setSwitching(true);
    try {
      const res = await fetch(`/api/scripts/${target.id}/select`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not switch script");
      setScripts((prev) => prev.map((s) => ({ ...s, is_selected: s.id === target.id })));
    } catch (err) {
      toast.error("Couldn't switch length", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSwitching(false);
    }
  };

  const updateActive = (updated: Script) =>
    setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  // Flushes any unsaved textarea edits before handing off — otherwise a typed-but-not-"Saved"
  // change would silently generate from the old body, so the script shown here would never
  // match the one baked into the video (see ScriptEditor.saveIfDirty).
  const handleContinue = async () => {
    setContinuing(true);
    try {
      const finalScript = (await editorRef.current?.saveIfDirty()) ?? active;
      updateActive(finalScript);
      onContinue(finalScript);
    } catch (err) {
      toast.error("Couldn't save your edits", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setContinuing(false);
    }
  };

  // Changing language or subtitles re-writes this script's body from scratch through the same
  // structured prompt as first-time generation — never a translation-in-place of the old text.
  const updateSettings = async (patch: { language?: ScriptLanguage; subtitles?: boolean }) => {
    setApplyingSettings(true);
    try {
      const res = await fetch(`/api/scripts/${active.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not regenerate the script");
      updateActive(data.script);
      toast.success("Script updated");
    } catch (err) {
      toast.error("Couldn't update script", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApplyingSettings(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      {originalTone && (
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
          >
            <MicVocal className="h-3 w-3" />
            Original tone: {originalTone}
          </Badge>
        </div>
      )}
      <div className="flex justify-center gap-2">
        {scripts.map((s) => (
          <button
            key={s.id}
            onClick={() => pick(s)}
            disabled={switching}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200",
              s.id === active.id
                ? "border-primary bg-accent text-accent-foreground shadow-glow"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {switching && s.id !== active.id ? (
              <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
            ) : null}
            {s.target_duration_seconds ?? "?"}s version
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5 rounded-2xl border bg-card px-4 py-3 shadow-card">
        <div className="flex items-center gap-2">
          <Label htmlFor="script-language" className="text-xs font-semibold text-muted-foreground">
            Language
          </Label>
          <Select
            value={active.language}
            onValueChange={(value) => updateSettings({ language: value as ScriptLanguage })}
            disabled={applyingSettings}
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
          <Label htmlFor="script-subtitles" className="text-xs font-semibold text-muted-foreground">
            Subtitles
          </Label>
          <Switch
            id="script-subtitles"
            checked={active.subtitles}
            onCheckedChange={(checked) => updateSettings({ subtitles: checked })}
            disabled={applyingSettings}
          />
        </div>
        {applyingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <ScriptEditor
        ref={editorRef}
        key={active.id}
        script={active}
        onBack={onBack}
        onSync={updateActive}
        onSave={updateActive}
      />
      <div className="flex justify-end">
        <Button
          size="lg"
          className="btn-glow h-12 rounded-xl px-8 font-semibold"
          onClick={handleContinue}
          disabled={continuing}
        >
          {continuing ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <ArrowRight className="h-4.5 w-4.5" />
          )}
          Continue to Settings
        </Button>
      </div>
    </div>
  );
}
