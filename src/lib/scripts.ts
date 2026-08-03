import type { SupabaseClient } from "@supabase/supabase-js";
import { generateMasterScript, type GeneratedScript } from "@/lib/ai/gemini";
import { ApiError } from "@/lib/auth";
import { requireProjectBrand } from "@/lib/projects";
import type { ScriptIdea, ScriptLanguage, VideoAnalysis } from "@/lib/types";

/**
 * The single call site that turns an idea (AI-pitched or custom) into a full script — used by
 * both first-time generation and any later regenerate/language/subtitle change, so they can
 * never drift onto different prompts/formats (see IdeaStep "Write Full Scripts" and
 * ScriptEditor "Regenerate").
 */
export async function writeScript(
  supabase: SupabaseClient,
  projectId: string,
  idea: ScriptIdea,
  options?: { language?: ScriptLanguage; subtitles?: boolean },
): Promise<{ analysisId: string; generated: GeneratedScript }> {
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
  const generated = await generateMasterScript(analysis, brand, idea, 15, options);
  return { analysisId: analysis.id, generated };
}
