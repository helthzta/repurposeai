import { type NextRequest, NextResponse } from "next/server";
import { generateMasterScript } from "@/lib/ai/gemini";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import type { ScriptIdea, VideoAnalysis } from "@/lib/types";

/** Writes the one full "master script" for whichever idea the user picked in IdeaStep. */
export const POST = withLogger("scripts.generate", async (req: NextRequest) => {
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

  const { data: brand, error: brandError } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("project_id", projectId)
    .single();
  if (brandError) throw brandError;

  const generated = await generateMasterScript(analysis, brand, idea);

  const { data: script, error } = await supabase
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
      language: generated.language,
      is_selected: true,
    })
    .select()
    .single();
  if (error) throw error;

  return NextResponse.json({ script }, { status: 201 });
});
