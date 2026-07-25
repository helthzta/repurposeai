import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreGeneration } from "@/lib/ai/gemini";
import { videoPrompt } from "@/lib/ai/prompts";
import { costForGeneration, refundCredits, spendCredits } from "@/lib/credits";
import { logError } from "@/lib/errors";
import { concatVideos, extractLastFrame } from "@/lib/ffmpeg";
import { logger } from "@/lib/logger";
import { getProvider } from "@/lib/providers";
import type { PollResult, VideoProvider } from "@/lib/providers/types";
import { mirrorToStorage, signUrl, uploadToStorage } from "@/lib/storage";
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
    // Durations past the provider's single-call cap render as an internal clip1,
    // continued by clip2, and stitched together — see pollAndFinalize below.
    const chained = params.durationSeconds > providerImpl.maxClipDurationSeconds;
    const firstClipSeconds = chained ? providerImpl.maxClipDurationSeconds : params.durationSeconds;

    logger.info("generation", "submitting to provider", {
      provider: params.provider,
      durationSeconds: firstClipSeconds,
      chained,
    });
    const { jobId } = await providerImpl.submit({
      prompt,
      durationSeconds: firstClipSeconds,
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
        chain_stage: chained ? "clip1" : null,
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

  if (generation.chain_stage === "clip1") {
    return advanceChainToClip2(client, userId, generation, result, providerImpl);
  }

  const output_path = `${userId}/${generation.project_id}/${generation.id}.mp4`;

  if (generation.chain_stage === "clip2") {
    return finalizeChain(
      client,
      userId,
      generation,
      result,
      providerImpl,
      output_path,
      script,
      brand,
    );
  }

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

/**
 * clip1 just completed. Seeds clip2 as a continuation from clip1's last frame and submits it —
 * the generation stays "processing" until clip2 also completes and gets stitched in finalizeChain.
 */
async function advanceChainToClip2(
  client: SupabaseClient,
  userId: string,
  generation: Generation,
  clip1Result: PollResult,
  providerImpl: VideoProvider,
): Promise<Generation> {
  logger.info("generation.chain", "clip1 complete, seeding clip2", { generationId: generation.id });

  try {
    const clip1Res = await fetch(clip1Result.outputUrl!, { headers: clip1Result.outputHeaders });
    if (!clip1Res.ok) throw new Error(`Failed to fetch first clip: ${clip1Res.status}`);
    const clip1Bytes = new Uint8Array(await clip1Res.arrayBuffer());

    const frameBytes = await extractLastFrame(clip1Bytes);
    const seedPath = `${userId}/${generation.project_id}/${generation.id}-seed.jpg`;
    await uploadToStorage(client, "generated-videos", seedPath, frameBytes, "image/jpeg");
    // Signed so the provider can fetch it without cookies/auth; short-lived since it only
    // needs to survive until the provider grabs it at job start, not the full render time.
    const seedUrl = await signUrl(client, "generated-videos", seedPath, 900);

    const remainingSeconds = generation.duration_seconds - providerImpl.maxClipDurationSeconds;
    const continuationPrompt = `${generation.prompt_used}\n\nThis is a direct continuation of the previous ${providerImpl.maxClipDurationSeconds}s scene — keep the same subject, setting, and visual style, picking up the action naturally from where it left off.`;

    const { jobId } = await providerImpl.submit({
      prompt: continuationPrompt,
      durationSeconds: remainingSeconds,
      aspectRatio: generation.aspect_ratio,
      quality: generation.quality,
      seedImageUrl: seedUrl,
    });
    logger.info("generation.chain", "clip2 submitted", { generationId: generation.id, jobId });

    const { data: updated, error } = await client
      .from("generations")
      .update({
        chain_stage: "clip2",
        chain_clip1_job_id: generation.provider_job_id,
        provider_job_id: jobId,
      })
      .eq("id", generation.id)
      .select()
      .single();
    if (error) throw error;

    return updated as Generation;
  } catch (chainError) {
    logger.error("generation.chain", "failed to advance to clip2");
    await logError("generation.chain", chainError, {
      userId,
      metadata: { generationId: generation.id },
    });
    return failGeneration(
      client,
      userId,
      generation,
      "Failed to continue the second half of the video",
    );
  }
}

/**
 * clip2 just completed. Re-fetches clip1 from the provider (never persisted to our own
 * storage — see the ponytail note below), stitches both, and delivers only the merged video.
 */
async function finalizeChain(
  client: SupabaseClient,
  userId: string,
  generation: Generation,
  clip2Result: PollResult,
  providerImpl: VideoProvider,
  output_path: string,
  script: Script,
  brand: BrandProfile,
): Promise<Generation> {
  // ponytail: re-fetching clip1 from the provider (rather than mirroring it into our own
  // storage at clip1-time) means the intermediate clip is never independently reachable
  // through the user's own storage RLS. Relies on the provider keeping a completed job's
  // output downloadable for as long as clip2 takes to render (a few minutes); if that
  // retention ever proves too short, mirror clip1 into a service-role-only bucket instead.
  const clip1Poll = await providerImpl.poll(generation.chain_clip1_job_id!);
  if (clip1Poll.status !== "completed" || !clip1Poll.outputUrl) {
    return failGeneration(
      client,
      userId,
      generation,
      "Could not retrieve the first clip to finish assembling the video",
    );
  }

  try {
    const [clip1Res, clip2Res] = await Promise.all([
      fetch(clip1Poll.outputUrl, { headers: clip1Poll.outputHeaders }),
      fetch(clip2Result.outputUrl!, { headers: clip2Result.outputHeaders }),
    ]);
    if (!clip1Res.ok || !clip2Res.ok) throw new Error("Failed to download one of the clips");

    const [clip1Bytes, clip2Bytes] = await Promise.all([
      clip1Res.arrayBuffer().then((b) => new Uint8Array(b)),
      clip2Res.arrayBuffer().then((b) => new Uint8Array(b)),
    ]);

    const merged = await concatVideos([clip1Bytes, clip2Bytes]);
    await uploadToStorage(client, "generated-videos", output_path, merged);
    await client.storage
      .from("generated-videos")
      .remove([`${userId}/${generation.project_id}/${generation.id}-seed.jpg`]);
  } catch (stitchError) {
    logger.error("generation.chain.stitch", "failed to assemble final video");
    await logError("generation.chain.stitch", stitchError, {
      userId,
      metadata: { generationId: generation.id },
    });
    return failGeneration(client, userId, generation, "Failed to assemble the final video");
  }

  return finishAfterUpload(client, userId, generation, output_path, script, brand);
}

/** Shared tail once a video (single-call or stitched) is uploaded to output_path: score + mark completed. */
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
      chain_stage: null,
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
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", generation.id)
    .select()
    .single();
  return (updated as Generation) ?? generation;
}
