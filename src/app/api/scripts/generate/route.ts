import { NextResponse } from "next/server";
import { generateScripts } from "@/lib/ai/gemini";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";
import type { VideoAnalysis } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireUser();
    const { projectId } = await request.json();
    if (!projectId) throw new ApiError(400, "projectId is required");

    const { data: analysis, error: analysisError } = await supabase
      .from("video_analyses")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single<VideoAnalysis>();
    if (analysisError) throw new ApiError(400, "Run analysis before generating scripts");

    const { data: brand, error: brandError } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("project_id", projectId)
      .single();
    if (brandError) throw brandError;

    const generated = await generateScripts(analysis, brand);

    const { data: scripts, error } = await supabase
      .from("scripts")
      .insert(
        generated.map((s) => ({
          project_id: projectId,
          analysis_id: analysis.id,
          style: s.style,
          title: s.title,
          hook: s.hook,
          body: s.body,
          scene_descriptions: s.scene_descriptions,
          emotional_direction: s.emotional_direction,
          cta: s.cta,
          estimated_duration: s.estimated_duration,
          language: s.language,
        })),
      )
      .select();
    if (error) throw error;

    return NextResponse.json({ scripts });
  } catch (error) {
    await logError("scripts.generate", error);
    return apiErrorResponse(error);
  }
}
