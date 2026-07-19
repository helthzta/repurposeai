import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("scripts.list", async (req: NextRequest) => {
  const { supabase } = await requireUser();
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) throw new ApiError(400, "projectId query param is required");

  const { data: latestAnalysis, error: analysisError } = await supabase
    .from("video_analyses")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (analysisError) throw analysisError;
  if (!latestAnalysis) return NextResponse.json({ scripts: [] });

  const { data: scripts, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("analysis_id", latestAnalysis.id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return NextResponse.json({ scripts });
});
