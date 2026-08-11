import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { writeScript } from "@/lib/scripts";
import type { Script, ScriptIdea, ScriptLanguage } from "@/lib/types";

/**
 * Full structured regenerate for an existing script — reconstructs the original idea from the
 * script's own stored fields and re-runs it through the same writeScript()/masterScriptPrompt()
 * path as first-time generation, so a plain "Regenerate" (or a language/subtitle change) can
 * never drift onto a different, less-structured prompt the way the old assist-based regenerate
 * did. Quick edits (Make Funnier, Shorter, etc.) stay on the lighter /assist route — those are
 * incremental tweaks to existing text, not a from-scratch rewrite.
 */
export const POST = withLogger(
  "scripts.regenerate",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase } = await requireUser();
    const { id } = await params;
    const { language, subtitles } = (await req.json().catch(() => ({}))) as {
      language?: ScriptLanguage;
      subtitles?: boolean;
    };

    const { data: current, error: fetchError } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", id)
      .single<Script>();
    if (fetchError) throw fetchError;

    const idea: ScriptIdea = {
      style: current.style,
      title: current.title,
      hook: current.hook ?? current.title,
      pitch: current.scene_descriptions ?? current.emotional_direction ?? current.title,
    };
    const nextSubtitles = subtitles ?? current.subtitles;
    // The script's own target_duration_seconds is authoritative here too — a regenerate must
    // keep fitting the same-length variant the user is editing, not silently default to 15s.
    const durationSeconds = (current.target_duration_seconds ?? 15) as 15 | 30;

    const { generated } = await writeScript(supabase, current.project_id, idea, durationSeconds, {
      language: language ?? (current.language as ScriptLanguage),
      subtitles: nextSubtitles,
    });

    const { data: script, error } = await supabase
      .from("scripts")
      .update({
        title: generated.title,
        hook: generated.hook,
        body: generated.body,
        scene_descriptions: generated.scene_descriptions,
        emotional_direction: generated.emotional_direction,
        cta: generated.cta,
        estimated_duration: generated.estimated_duration,
        language: generated.language,
        subtitles: nextSubtitles,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ script });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
