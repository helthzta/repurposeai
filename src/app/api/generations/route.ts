import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createGeneration } from "@/lib/generation";
import type { AspectRatio, Quality, VideoProviderName } from "@/lib/types";

export async function POST(req: NextRequest) {
  const start = Date.now();
  logger.info("generations.create", `POST ${req.nextUrl.pathname}`);
  try {
    const { supabase, user } = await requireUser();
    const body = await req.json();
    const { projectId, scriptId, provider, durationSeconds, aspectRatio, quality, cameraStyle } =
      body as {
        projectId?: string;
        scriptId?: string;
        provider?: VideoProviderName;
        durationSeconds?: number;
        aspectRatio?: AspectRatio;
        quality?: Quality;
        cameraStyle?: string;
      };

    if (
      !projectId ||
      !scriptId ||
      !provider ||
      !durationSeconds ||
      !aspectRatio ||
      !quality ||
      !cameraStyle
    ) {
      throw new ApiError(
        400,
        "projectId, scriptId, provider, durationSeconds, aspectRatio, quality and cameraStyle are required",
      );
    }

    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", scriptId)
      .single();
    if (scriptError) throw new ApiError(404, "Script not found");

    const { data: brand, error: brandError } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("project_id", projectId)
      .single();
    if (brandError) throw brandError;

    const generation = await createGeneration(supabase, user.id, script, brand, {
      projectId,
      scriptId,
      provider,
      durationSeconds,
      aspectRatio,
      quality,
      cameraStyle,
    });

    logger.info("generations.create", `201 created (${Date.now() - start}ms)`, {
      id: generation.id,
    });
    return NextResponse.json({ generation }, { status: 201 });
  } catch (error) {
    logger.error("generations.create", `failed (${Date.now() - start}ms)`);
    if (error instanceof Error && error.message === "insufficient_credits") {
      return NextResponse.json(
        { error: "Not enough credits for this generation" },
        { status: 402 },
      );
    }
    await logError("generations.create", error);
    return apiErrorResponse(error);
  }
}
