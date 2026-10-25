import { type NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { writeScript } from "@/lib/scripts";
import type { ScriptIdea, ScriptLanguage } from "@/lib/types";

/**
 * Writes the "master script" for whichever idea the user picked (or typed themselves) in
 * IdeaStep — routed through the shared writeScript() helper so this is byte-for-byte the same
 * prompt/schema call as a later regenerate. Writes both the 15s and 30s variants up front (each
 * paced to its own runtime, not just truncated/padded from the other) so the Settings step (GenerateStep) can switch
 * between them instantly — the 15s variant starts out selected.
 */
export const POST = withLogger(
  "scripts.generate",
  async (req: NextRequest) => {
    const { supabase } = await requireUser();
    const { projectId, idea, language, subtitles } = (await req.json()) as {
      projectId?: string;
      idea?: ScriptIdea;
      language?: ScriptLanguage;
      subtitles?: boolean;
    };
    if (!projectId || !idea) throw new ApiError(400, "projectId and idea are required");

    const durations = [15, 30] as const;
    const written = await Promise.all(
      durations.map((durationSeconds) =>
        writeScript(supabase, projectId, idea, durationSeconds, { language, subtitles }),
      ),
    );

    const { data: scripts, error } = await supabase
      .from("scripts")
      .insert(
        written.map(({ analysisId, generated }, i) => ({
          project_id: projectId,
          analysis_id: analysisId,
          // A user-typed or reclone idea keeps its own style rather than whatever Gemini classified
          // the body as, so a later regenerate reconstructs the same idea shape from this row.
          style: idea.style === "custom" || idea.style === "reclone" ? idea.style : generated.style,
          title: generated.title,
          hook: generated.hook,
          body: generated.body,
          scene_descriptions: generated.scene_descriptions,
          emotional_direction: generated.emotional_direction,
          cta: generated.cta,
          estimated_duration: generated.estimated_duration,
          target_duration_seconds: durations[i],
          language: generated.language,
          subtitles: subtitles ?? false,
          is_selected: durations[i] === 15,
        })),
      )
      .select();
    if (error) throw error;

    return NextResponse.json({ scripts }, { status: 201 });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
