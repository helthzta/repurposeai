import { NextResponse } from "next/server";
import { analyzeVideo, generateScripts } from "@/lib/ai/gemini";
import { ApiError, apiErrorResponse, requireApiKey } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { createGeneration } from "@/lib/generation";
import type { AspectRatio, Quality, VideoProviderName } from "@/lib/types";

/**
 * Public integration endpoint matching the curl example in the API-keys page
 * (src/app/api/api-client.tsx): POST /api/v1/commercials { source_video, brand, length, aspect_ratio, provider }.
 *
 * ponytail: this runs the whole analyze -> script -> generate pipeline synchronously
 * in one request. Fine for an MVP; move to a background queue if callers hit
 * request timeouts on longer videos.
 */
export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireApiKey(request);
    const body = await request.json();
    const {
      source_video: sourceVideoUrl,
      brand,
      length,
      aspect_ratio: aspectRatio,
      provider,
    } = body as {
      source_video?: string;
      brand?: string;
      length?: number;
      aspect_ratio?: AspectRatio;
      provider?: VideoProviderName;
    };

    if (!sourceVideoUrl || !brand || !length || !aspectRatio || !provider) {
      throw new ApiError(
        400,
        "source_video, brand, length, aspect_ratio and provider are required",
      );
    }

    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({ user_id: userId, name: brand, status: "analyzing" })
      .select()
      .single();
    if (projectError) throw projectError;

    const { data: brandProfile, error: brandError } = await admin
      .from("brand_profiles")
      .insert({ project_id: project.id, brand_name: brand })
      .select()
      .single();
    if (brandError) throw brandError;

    const videoRes = await fetch(sourceVideoUrl);
    if (!videoRes.ok)
      throw new ApiError(400, `Could not download source_video: ${videoRes.status}`);
    const mimeType = videoRes.headers.get("content-type") || "video/mp4";
    const bytes = Buffer.from(await videoRes.arrayBuffer());

    const storagePath = `${userId}/${project.id}/competitor-${Date.now()}.mp4`;
    const { error: uploadError } = await admin.storage
      .from("source-videos")
      .upload(storagePath, bytes, {
        contentType: mimeType,
      });
    if (uploadError) throw uploadError;

    const { data: sourceVideo, error: sourceVideoError } = await admin
      .from("source_videos")
      .insert({
        project_id: project.id,
        kind: "competitor",
        storage_path: storagePath,
        mime_type: mimeType,
      })
      .select()
      .single();
    if (sourceVideoError) throw sourceVideoError;

    const analysisResult = await analyzeVideo(bytes, mimeType);
    const { data: analysis, error: analysisError } = await admin
      .from("video_analyses")
      .insert({
        project_id: project.id,
        source_video_id: sourceVideo.id,
        status: "completed",
        ...analysisResult,
        raw_response: analysisResult,
      })
      .select()
      .single();
    if (analysisError) throw analysisError;

    const generated = await generateScripts(analysis, brandProfile);
    const { data: scripts, error: scriptsError } = await admin
      .from("scripts")
      .insert(
        generated.map((s) => ({
          project_id: project.id,
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
    if (scriptsError) throw scriptsError;

    const selected = scripts.find((s) => s.style === "high_conversion") ?? scripts[0];
    await admin.from("scripts").update({ is_selected: true }).eq("id", selected.id);
    await admin.from("projects").update({ status: "scripted" }).eq("id", project.id);

    const generation = await createGeneration(admin, userId, selected, brandProfile, {
      projectId: project.id,
      scriptId: selected.id,
      provider,
      durationSeconds: length,
      aspectRatio,
      quality: "high",
      cameraStyle: "commercial",
    });

    return NextResponse.json({ id: generation.id, status: generation.status });
  } catch (error) {
    if (error instanceof Error && error.message === "insufficient_credits") {
      return NextResponse.json(
        { error: "Not enough credits for this generation" },
        { status: 402 },
      );
    }
    await logError("v1.commercials.create", error);
    return apiErrorResponse(error);
  }
}
