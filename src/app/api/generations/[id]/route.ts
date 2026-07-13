import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";
import { pollAndFinalize } from "@/lib/generation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const { data: brand, error: brandError } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("project_id", generation.project_id)
      .single();
    if (brandError) throw brandError;

    const finalized = await pollAndFinalize(supabase, user.id, generation, script, brand);

    if (finalized.status === "completed" || finalized.status === "failed") {
      await supabase
        .from("projects")
        .update({ status: finalized.status })
        .eq("id", generation.project_id);
    }

    return NextResponse.json({ generation: finalized });
  } catch (error) {
    await logError("generations.get", error);
    return apiErrorResponse(error);
  }
}
