import { type NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { createGeneration } from "@/lib/generation";
import { requireProjectBrand } from "@/lib/projects";

// Keep in sync with the Camera Style options in GenerateStep.tsx.
const CAMERA_STYLES = ["original", "commercial", "luxury", "cinematic", "product", "ugc"] as const;

export const POST = withLogger(
  "generations.regenerate",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

    const brand = await requireProjectBrand(supabase, previous.project_id);

    // "Variation" is only meaningfully different from "Regenerate" if something
    // about the request actually changes — otherwise they're the same call twice.
    const otherStyles = CAMERA_STYLES.filter((s) => s !== previous.camera_style);
    const cameraStyle =
      variation && otherStyles.length > 0
        ? otherStyles[Math.floor(Math.random() * otherStyles.length)]
        : previous.camera_style;

    let generation;
    try {
      generation = await createGeneration(supabase, user.id, script, brand, {
        projectId: previous.project_id,
        scriptId: previous.script_id,
        provider: previous.provider,
        durationSeconds: previous.duration_seconds,
        aspectRatio: previous.aspect_ratio,
        quality: previous.quality,
        cameraStyle,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "insufficient_credits") {
        throw new ApiError(402, "Not enough credits to regenerate");
      }
      throw error;
    }

    return NextResponse.json({ generation }, { status: 201 });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
