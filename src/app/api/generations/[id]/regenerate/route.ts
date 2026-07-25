import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createGeneration } from "@/lib/generation";

// Keep in sync with the Camera Style options in GenerateStep.tsx.
const CAMERA_STYLES = ["original", "commercial", "luxury", "cinematic", "product", "ugc"] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  logger.info("generations.regenerate", `POST ${req.nextUrl.pathname}`);
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const { variation } = (await req.json().catch(() => ({}))) as { variation?: boolean };

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

    // "Variation" is only meaningfully different from "Regenerate" if something
    // about the request actually changes — otherwise they're the same call twice.
    const otherStyles = CAMERA_STYLES.filter((s) => s !== previous.camera_style);
    const cameraStyle =
      variation && otherStyles.length > 0
        ? otherStyles[Math.floor(Math.random() * otherStyles.length)]
        : previous.camera_style;

    const generation = await createGeneration(supabase, user.id, script, brand, {
      projectId: previous.project_id,
      scriptId: previous.script_id,
      provider: previous.provider,
      durationSeconds: previous.duration_seconds,
      aspectRatio: previous.aspect_ratio,
      quality: previous.quality,
      cameraStyle,
    });

    logger.info("generations.regenerate", `201 created (${Date.now() - start}ms)`, {
      id: generation.id,
    });
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
