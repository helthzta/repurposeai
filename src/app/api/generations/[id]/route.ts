import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { pollAndFinalize } from "@/lib/generation";
import { requireProjectBrand } from "@/lib/projects";

export const GET = withLogger(
  "generations.get",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { data: generation, error } = await supabase
      .from("generations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;

    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", generation.script_id)
      .single();
    if (scriptError) throw scriptError;

    const brand = await requireProjectBrand(supabase, generation.project_id);

    const finalized = await pollAndFinalize(supabase, user.id, generation, script, brand);

    if (finalized.status === "completed" || finalized.status === "failed") {
      await supabase
        .from("projects")
        .update({ status: finalized.status })
        .eq("id", generation.project_id);
    }

    return NextResponse.json({ generation: finalized });
  },
);
