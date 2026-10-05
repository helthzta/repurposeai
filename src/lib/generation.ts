import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreGeneration } from "@/lib/ai/gemini";
import { videoPrompt } from "@/lib/ai/prompts";
import { ApiError } from "@/lib/auth";
import { refundCredits, spendCredits } from "@/lib/credit-ledger";
import { costForGeneration } from "@/lib/credits";
import { logError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getProvider } from "@/lib/providers";
import { mirrorToStorage, publicStorageUrl, signUrl } from "@/lib/storage";
import type {
  AspectRatio,
  BrandProfile,
  Generation,
  Quality,
  Script,
  VideoProviderName,
} from "@/lib/types";

export interface CreateGenerationParams {
  projectId: string;
  scriptId: string;
  provider: VideoProviderName;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  quality: Quality;
  cameraStyle: string;
}

/** Shared by the dashboard's POST /api/generations, its regenerate route, and the public v1 API. */
export async function createGeneration(
  client: SupabaseClient,
  userId: string,
  script: Script,
  brand: BrandProfile,
  params: CreateGenerationParams,
): Promise<Generation> {
  // Admins generate for free so they can always test — nothing is charged, so nothing is
  // refunded on failure either (credits_charged is stored as 0).
  const { data: profile } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  const cost = profile?.is_admin
    ? 0
    : costForGeneration(params.durationSeconds, params.quality, params.aspectRatio);
  if (cost > 0) {
    logger.info("generation", "spending credits", { userId, cost, projectId: params.projectId });
    await spendCredits(userId, cost, "generation", "project", params.projectId);
  }

  // "Original" camera style means "match the source video we analyzed" — only look that
  // up when actually needed, not on every generation.
  let sourceVisualStyle: string | null = null;
  if (params.cameraStyle === "original") {
    const { data: analysis } = await client
      .from("video_analyses")
      .select("visual_style")
      .eq("project_id", params.projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sourceVisualStyle = analysis?.visual_style ?? null;
  }

  const prompt = videoPrompt({
    scriptBody: script.body,
    brand,
    durationSeconds: params.durationSeconds,
    aspectRatio: params.aspectRatio,
    quality: params.quality,
    cameraStyle: params.cameraStyle,
    sourceVisualStyle,
  });

  try {
    const providerImpl = getProvider(params.provider);
    // Guards against a stale script row requesting a duration longer than the provider's
    // native single-call ceiling (see maxClipDurationSeconds in providers/types.ts).
    if (params.durationSeconds > providerImpl.maxClipDurationSeconds) {
      throw new ApiError(
        400,
        `${params.durationSeconds}s generation isn't available yet — pick the 15s version`,
      );
    }

    logger.info("generation", "submitting to provider", {
      provider: params.provider,
      durationSeconds: params.durationSeconds,
    });
    // Logo goes in as an actual reference image, not just text — the prompt/script can describe
    // it, but only this makes the provider ground the FINAL FRAME's on-screen logo shot in the
    // real thing (brand-logos is a public bucket, so a plain URL is all the provider needs).
    const logoUrl = brand.logo_path ? publicStorageUrl("brand-logos", brand.logo_path) : null;

    const { jobId } = await providerImpl.submit({
      prompt,
      durationSeconds: params.durationSeconds,
      aspectRatio: params.aspectRatio,
      quality: params.quality,
      referenceImageUrls: logoUrl ? [logoUrl] : undefined,
    });
    logger.info("generation", "provider job submitted", { jobId });

    const { data: generation, error } = await client
      .from("generations")
      .insert({
        project_id: params.projectId,
        script_id: params.scriptId,
        provider: params.provider,
        duration_seconds: params.durationSeconds,
        aspect_ratio: params.aspectRatio,
        quality: params.quality,
        camera_style: params.cameraStyle,
        status: "processing",
        prompt_used: prompt,
        // Frozen at submit time — script.body itself can be edited/regenerated afterward, this can't.
        script_body: script.body,
        provider_job_id: jobId,
        credits_charged: cost,
      })
      .select()
      .single();
    if (error) throw error;

    await client.from("projects").update({ status: "generating" }).eq("id", params.projectId);

    return generation as Generation;
  } catch (submitError) {
    if (cost > 0) {
      await refundCredits(userId, cost, "generation_refund", "project", params.projectId);
    }
    await logError("generation.submit", submitError, {
      userId,
      metadata: { projectId: params.projectId },
    });
    throw submitError;
  }
}

/** Polls the provider (if still processing) and finalizes storage/credits/insights on completion. */
export async function pollAndFinalize(
  client: SupabaseClient,
  userId: string,
  generation: Generation,
  script: Script,
  brand: BrandProfile,
): Promise<Generation> {
  if (generation.status !== "processing" || !generation.provider_job_id) {
    if (generation.status === "completed" && generation.output_path) {
      const output_url = await signUrl(client, "generated-videos", generation.output_path);
      return { ...generation, output_url };
    }
    return generation;
  }

  const providerImpl = getProvider(generation.provider);
  logger.info("generation.poll", "polling provider", {
    provider: generation.provider,
    jobId: generation.provider_job_id,
  });
  const result = await providerImpl.poll(generation.provider_job_id);
  logger.info("generation.poll", `poll result: ${result.status}`, { generationId: generation.id });

  if (result.status === "processing") return generation;

  if (result.status === "failed") {
    return failGeneration(client, userId, generation, result.error ?? "Generation failed");
  }

  // A "succeeded" provider result with no playable video is a failure from the
  // user's perspective — never mark it completed without a stored output.
  if (!result.outputUrl) {
    return failGeneration(client, userId, generation, "Provider returned no video output");
  }

  const output_path = `${userId}/${generation.project_id}/${generation.id}.mp4`;

  logger.info("generation.mirror", "mirroring video to storage", { output_path });
  try {
    await mirrorToStorage(
      client,
      "generated-videos",
      output_path,
      result.outputUrl,
      result.outputHeaders,
    );
    logger.info("generation.mirror", "video mirrored successfully");
  } catch (mirrorError) {
    logger.error("generation.mirror", "failed to mirror video");
    await logError("generation.mirror", mirrorError, {
      userId,
      metadata: { generationId: generation.id },
    });
    return failGeneration(client, userId, generation, "Failed to save the generated video");
  }

  return finishAfterUpload(client, userId, generation, output_path, script, brand);
}

/** Shared tail once a video is uploaded to output_path: score + mark completed. */
async function finishAfterUpload(
  client: SupabaseClient,
  userId: string,
  generation: Generation,
  output_path: string,
  script: Script,
  brand: BrandProfile,
): Promise<Generation> {
  let ai_insights = null;
  try {
    logger.info("generation.score", "scoring generation with Gemini");
    ai_insights = await scoreGeneration(script.body, brand);
    logger.info("generation.score", "scoring complete");
  } catch (scoreError) {
    logger.error("generation.score", "scoring failed — continuing without insights");
    await logError("generation.score", scoreError, {
      userId,
      metadata: { generationId: generation.id },
    });
  }

  const { data: updated, error } = await client
    .from("generations")
    .update({
      status: "completed",
      output_path,
      ai_insights,
      completed_at: new Date().toISOString(),
    })
    .eq("id", generation.id)
    .select()
    .single();
  if (error) throw error;

  const output_url = await signUrl(client, "generated-videos", output_path);
  return { ...(updated as Generation), output_url };
}

/** Refunds the charge and marks a generation failed — shared by every failure path above. */
async function failGeneration(
  client: SupabaseClient,
  userId: string,
  generation: Generation,
  errorMessage: string,
): Promise<Generation> {
  if (generation.credits_charged > 0) {
    await refundCredits(
      userId,
      generation.credits_charged,
      "generation_refund",
      "generation",
      generation.id,
    );
  }
  const { data: updated } = await client
    .from("generations")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", generation.id)
    .select()
    .single();
  return (updated as Generation) ?? generation;
}
