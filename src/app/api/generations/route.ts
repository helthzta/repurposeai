import { type NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { createGeneration } from "@/lib/generation";
import type { AspectRatio, Quality, VideoProviderName } from "@/lib/types";

export const POST = withLogger(
  "generations.create",
  async (req: NextRequest) => {
    const { supabase, user } = await requireUser();
    const body = await req.json();
    const { projectId, scriptId, provider, aspectRatio, quality, cameraStyle } = body as {
      projectId?: string;
      scriptId?: string;
      provider?: VideoProviderName;
      aspectRatio?: AspectRatio;
      quality?: Quality;
      cameraStyle?: string;
    };

    if (!projectId || !scriptId || !provider || !aspectRatio || !quality || !cameraStyle) {
      throw new ApiError(
        400,
        "projectId, scriptId, provider, aspectRatio, quality and cameraStyle are required",
      );
    }

    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", scriptId)
      .single();
    if (scriptError) throw new ApiError(404, "Script not found");

    // The script's own target_duration_seconds is authoritative — it's what its scene
    // timestamps were actually written to fit, not whatever a client might send.
    const durationSeconds = script.target_duration_seconds;
    if (!durationSeconds) {
      throw new ApiError(400, "This script has no target duration — pick a 15s or 30s version");
    }

    const { data: brand, error: brandError } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("project_id", projectId)
      .single();
    if (brandError) throw brandError;

    let generation;
    try {
      generation = await createGeneration(supabase, user.id, script, brand, {
        projectId,
        scriptId,
        provider,
        durationSeconds,
        aspectRatio,
        quality,
        cameraStyle,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "insufficient_credits") {
        throw new ApiError(402, "Not enough credits for this generation");
      }
      throw error;
    }

    return NextResponse.json({ generation }, { status: 201 });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
