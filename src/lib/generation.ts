import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreGeneration } from "@/lib/ai/gemini";
import { videoPrompt } from "@/lib/ai/prompts";
import { costForGeneration, refundCredits, spendCredits } from "@/lib/credits";
import { logError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getProvider } from "@/lib/providers";
import { mirrorToStorage, signUrl } from "@/lib/storage";
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
  const cost = costForGeneration(params.durationSeconds, params.quality, params.aspectRatio);
  logger.info("generation", "spending credits", { userId, cost, projectId: params.projectId });
  await spendCredits(client, userId, cost, "generation", "project", params.projectId);

  const prompt = videoPrompt({
    scriptBody: script.body,
    brand,
    durationSeconds: params.durationSeconds,
    aspectRatio: params.aspectRatio,
    quality: params.quality,
    cameraStyle: params.cameraStyle,
  });

  try {
    const providerImpl = getProvider(params.provider);
    logger.info("generation", "submitting to provider", { provider: params.provider, durationSeconds: params.durationSeconds });
    const { jobId } = await providerImpl.submit({
      prompt,
      durationSeconds: params.durationSeconds,
      aspectRatio: params.aspectRatio,
      quality: params.quality,
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
        provider_job_id: jobId,
        credits_charged: cost,
      })
      .select()
      .single();
    if (error) throw error;

    await client.from("projects").update({ status: "generating" }).eq("id", params.projectId);

    return generation as Generation;
  } catch (submitError) {
    await refundCredits(client, userId, cost, "generation_refund", "project", params.projectId);
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
  logger.info("generation.poll", "polling provider", { provider: generation.provider, jobId: generation.provider_job_id });
  const result = await providerImpl.poll(generation.provider_job_id);
  logger.info("generation.poll", `poll result: ${result.status}`, { generationId: generation.id });

  if (result.status === "processing") return generation;

  if (result.status === "failed") {
    await refundCredits(
      client,
      userId,
      generation.credits_charged,
      "generation_refund",
      "generation",
      generation.id,
    );
    const { data: updated } = await client
      .from("generations")
      .update({
        status: "failed",
        error_message: result.error ?? "Generation failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", generation.id)
      .select()
      .single();
    return (updated as Generation) ?? generation;
  }

  let output_path: string | null = null;
  if (result.outputUrl) {
    output_path = `${userId}/${generation.project_id}/${generation.id}.mp4`;
    logger.info("generation.mirror", "mirroring video to storage", { output_path });
    try {
      await mirrorToStorage(client, "generated-videos", output_path, result.outputUrl);
      logger.info("generation.mirror", "video mirrored successfully");
    } catch (mirrorError) {
      logger.error("generation.mirror", "failed to mirror video");
      await logError("generation.mirror", mirrorError, {
        userId,
        metadata: { generationId: generation.id },
      });
      output_path = null;
    }
  }

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

  const output_url = output_path ? await signUrl(client, "generated-videos", output_path) : null;
  return { ...(updated as Generation), output_url };
}
