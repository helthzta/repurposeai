import { type NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/ai/gemini";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("analyze.get", async (req: NextRequest) => {
  const { supabase } = await requireUser();
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) throw new ApiError(400, "projectId query param is required");

  const { data: analysis, error } = await supabase
    .from("video_analyses")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  return NextResponse.json({ analysis });
});

export const POST = withLogger(
  "analyze.post",
  async (req: NextRequest) => {
    const { supabase } = await requireUser();

    let projectId: string | undefined;
    let sourceVideoId: string | undefined;

    try {
      const body = await req.json();
      projectId = body.projectId;
      if (!projectId) throw new ApiError(400, "projectId is required");

      const { data: sourceVideo, error: videoError } = await supabase
        .from("source_videos")
        .select("*")
        .eq("project_id", projectId)
        .eq("kind", "competitor")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (videoError) throw new ApiError(404, "No competitor video uploaded for this project yet");
      sourceVideoId = sourceVideo.id;

      await supabase.from("projects").update({ status: "analyzing" }).eq("id", projectId);

      const { data: fileBytes, error: downloadError } = await supabase.storage
        .from("source-videos")
        .download(sourceVideo.storage_path);
      if (downloadError || !fileBytes) throw new ApiError(500, "Failed to read the uploaded video");

      const buffer = Buffer.from(await fileBytes.arrayBuffer());
      const mimeType = sourceVideo.mime_type || fileBytes.type || "video/mp4";

      const result = await analyzeVideo(buffer, mimeType);

      const { data: analysis, error: insertError } = await supabase
        .from("video_analyses")
        .insert({
          project_id: projectId,
          source_video_id: sourceVideo.id,
          status: "completed",
          ...result,
          raw_response: result,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      await supabase.from("projects").update({ status: "scripted" }).eq("id", projectId);

      return NextResponse.json({ analysis });
    } catch (error) {
      // Best-effort: mark DB records as failed so UI can show error state, then let
      // withLogger's outer catch do the standard logging/response.
      if (projectId) {
        await supabase.from("projects").update({ status: "failed" }).eq("id", projectId);
        if (sourceVideoId) {
          await supabase.from("video_analyses").insert({
            project_id: projectId,
            source_video_id: sourceVideoId,
            status: "failed",
            error_message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      throw error;
    }
  },
  { rateLimit: { limit: 5, windowMs: 60_000 } },
);
