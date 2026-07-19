import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createGeneration } from "@/lib/generation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  logger.info("generations.regenerate", `POST ${req.nextUrl.pathname}`);
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { data: previous, error } = await supabase
      .from("generations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;

    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", previous.script_id)
      .single();
    if (scriptError) throw scriptError;

    const { data: brand, error: brandError } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("project_id", previous.project_id)
      .single();
    if (brandError) throw brandError;

    const generation = await createGeneration(supabase, user.id, script, brand, {
      projectId: previous.project_id,
      scriptId: previous.script_id,
      provider: previous.provider,
      durationSeconds: previous.duration_seconds,
      aspectRatio: previous.aspect_ratio,
      quality: previous.quality,
      cameraStyle: previous.camera_style,
    });

    logger.info("generations.regenerate", `201 created (${Date.now() - start}ms)`, { id: generation.id });
    return NextResponse.json({ generation }, { status: 201 });
  } catch (error) {
    logger.error("generations.regenerate", `failed (${Date.now() - start}ms)`);
    if (error instanceof Error && error.message === "insufficient_credits") {
      return NextResponse.json({ error: "Not enough credits to regenerate" }, { status: 402 });
    }
    await logError("generations.regenerate", error);
    return apiErrorResponse(error);
  }
}
