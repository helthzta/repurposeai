import { type NextRequest, NextResponse } from "next/server";
import { ApiError, requireApiKey } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { pollAndFinalize } from "@/lib/generation";

export const GET = withLogger(
  "v1.commercials.get",
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { admin, userId } = await requireApiKey(request);
    const { id } = await params;

    const { data: generation, error } = await admin
      .from("generations")
      .select("*, projects!inner(user_id)")
      .eq("id", id)
      .single();
    if (error || !generation) throw new ApiError(404, "Commercial not found");
    if (generation.projects.user_id !== userId) throw new ApiError(404, "Commercial not found");

    const { data: script, error: scriptError } = await admin
      .from("scripts")
      .select("*")
      .eq("id", generation.script_id)
      .single();
    if (scriptError) throw scriptError;

    const { data: brand, error: brandError } = await admin
      .from("brand_profiles")
      .select("*")
      .eq("project_id", generation.project_id)
      .single();
    if (brandError) throw brandError;

    const finalized = await pollAndFinalize(admin, userId, generation, script, brand);

    return NextResponse.json({
      id: finalized.id,
      status: finalized.status,
      output_url: finalized.output_url,
      prompt_used: finalized.prompt_used,
      ai_insights: finalized.ai_insights,
      error_message: finalized.error_message,
    });
  },
  { rateLimit: { limit: 60, windowMs: 60_000 } },
);
