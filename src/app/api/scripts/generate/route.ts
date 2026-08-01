import { type NextRequest, NextResponse } from "next/server";
import { generateMasterScript } from "@/lib/ai/gemini";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { requireProjectBrand } from "@/lib/projects";
import type { ScriptIdea, VideoAnalysis } from "@/lib/types";

/**
 * Writes the "master script" for whichever idea the user picked in IdeaStep.
 * 15s is the only active duration for now — see 30s "Coming Soon" state in ScriptStep.tsx.
 */
export const POST = withLogger(
  "scripts.generate",
  async (req: NextRequest) => {
    const { supabase } = await requireUser();
    const { projectId, idea } = (await req.json()) as { projectId?: string; idea?: ScriptIdea };
    if (!projectId || !idea) throw new ApiError(400, "projectId and idea are required");

    const { data: analysis, error: analysisError } = await supabase
      .from("video_analyses")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single<VideoAnalysis>();
    if (analysisError) throw new ApiError(400, "Run analysis before generating a script");

    const brand = await requireProjectBrand(supabase, projectId);

    const generated = await generateMasterScript(analysis, brand, idea, 15);

    const { data: scripts, error } = await supabase
      .from("scripts")
      .insert({
        project_id: projectId,
        analysis_id: analysis.id,
        style: generated.style,
        title: generated.title,
        hook: generated.hook,
        body: generated.body,
        scene_descriptions: generated.scene_descriptions,
        emotional_direction: generated.emotional_direction,
        cta: generated.cta,
        estimated_duration: generated.estimated_duration,
        target_duration_seconds: 15,
        language: generated.language,
        is_selected: true,
      })
      .select();
    if (error) throw error;

    return NextResponse.json({ scripts }, { status: 201 });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
