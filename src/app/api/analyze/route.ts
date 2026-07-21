import { type NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/ai/gemini";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const start = Date.now();
  logger.info("analyze.get", `GET ${req.nextUrl.pathname}`);
  try {
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

    logger.info("analyze.get", `200 OK (${Date.now() - start}ms)`);
    return NextResponse.json({ analysis });
  } catch (error) {
    logger.error("analyze.get", `failed (${Date.now() - start}ms)`);
    await logError("analyze.get", error);
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  logger.info("analyze.post", `POST ${req.nextUrl.pathname}`);

  let auth: Awaited<ReturnType<typeof requireUser>>;
  try {
    auth = await requireUser();
  } catch (error) {
    logger.error("analyze.post", `failed (${Date.now() - start}ms)`);
    await logError("analyze.post", error);
    return apiErrorResponse(error);
  }
  const { supabase, user } = auth;

  let projectId: string | undefined;
  let sourceVideoId: string | undefined;

  try {
    const body = await req.json();
    projectId = body.projectId;
    if (!projectId) throw new ApiError(400, "projectId is required");

    logger.info("analyze.post", "fetching source video", { projectId });

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
    logger.info("analyze.post", "downloading video from storage", {
      path: sourceVideo.storage_path,
    });

    const { data: fileBytes, error: downloadError } = await supabase.storage
      .from("source-videos")
      .download(sourceVideo.storage_path);
    if (downloadError || !fileBytes) throw new ApiError(500, "Failed to read the uploaded video");

    const buffer = Buffer.from(await fileBytes.arrayBuffer());
    const mimeType = sourceVideo.mime_type || fileBytes.type || "video/mp4";
    logger.info("analyze.post", "sending to Gemini for analysis", {
      mimeType,
      bytes: buffer.length,
    });

    const result = await analyzeVideo(buffer, mimeType);
    logger.info("analyze.post", "Gemini analysis complete");

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
    logger.info("analyze.post", `201 done (${Date.now() - start}ms)`, { analysisId: analysis.id });

    return NextResponse.json({ analysis });
  } catch (error) {
    logger.error("analyze.post", `failed (${Date.now() - start}ms)`);
    // Best-effort: mark DB records as failed so UI can show error state
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
    await logError("analyze.post", error, { userId: user.id, metadata: { projectId } });
    return apiErrorResponse(error);
  }
}
