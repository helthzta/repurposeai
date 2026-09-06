import { type NextRequest, NextResponse } from "next/server";
import { generateScriptIdeas } from "@/lib/ai/gemini";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { requireProjectBrand } from "@/lib/projects";
import type { ScriptIdea, VideoAnalysis } from "@/lib/types";

/** Short concepts shown before committing to a full script — cached on the project, see IdeaStep.tsx. */
export const POST = withLogger(
  "scripts.ideas",
  async (req: NextRequest) => {
    const { supabase } = await requireUser();
    const body = await req.json();
    const { projectId, preserveReclone } = body as {
      projectId?: string;
      /** When true, the existing reclone idea is preserved and only the 2 repurposed ideas are regenerated. */
      preserveReclone?: boolean;
    };
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

    const brand = await requireProjectBrand(supabase, projectId);

    // If preserveReclone is requested, find the cached reclone idea to keep it unchanged
    let keepRecloneIdea: ScriptIdea | null = null;
    if (preserveReclone) {
      const { data: project } = await supabase
        .from("projects")
        .select("script_ideas")
        .eq("id", projectId)
        .single();
      const cachedIdeas = (project?.script_ideas as ScriptIdea[] | null) ?? [];
      keepRecloneIdea = cachedIdeas.find((idea) => idea.style === "reclone") ?? null;
    }

    const ideas = await generateScriptIdeas(analysis, brand, keepRecloneIdea);

    // Cached on the project so navigating back to the Ideas step (or reloading) shows the
    // same ideas instead of burning another Gemini call for a different set — see IdeaStep.tsx.
    await supabase.from("projects").update({ script_ideas: ideas }).eq("id", projectId);

    return NextResponse.json({ ideas });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
