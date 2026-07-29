import { type NextRequest, NextResponse } from "next/server";
import { generateScriptIdeas } from "@/lib/ai/gemini";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import type { VideoAnalysis } from "@/lib/types";

/** Short concepts shown before committing to a full script — cached on the project, see IdeaStep.tsx. */
export const POST = withLogger(
  "scripts.ideas",
  async (req: NextRequest) => {
    const { supabase } = await requireUser();
    const { projectId } = await req.json();
    if (!projectId) throw new ApiError(400, "projectId is required");

    const { data: analysis, error: analysisError } = await supabase
      .from("video_analyses")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single<VideoAnalysis>();
    if (analysisError) throw new ApiError(400, "Run analysis before generating ideas");

    const { data: brand, error: brandError } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("project_id", projectId)
      .single();
    if (brandError) throw brandError;

    const ideas = await generateScriptIdeas(analysis, brand);

    // Cached on the project so navigating back to the Ideas step (or reloading) shows the
    // same ideas instead of burning another Gemini call for a different set — see IdeaStep.tsx.
    await supabase.from("projects").update({ script_ideas: ideas }).eq("id", projectId);

    return NextResponse.json({ ideas });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
