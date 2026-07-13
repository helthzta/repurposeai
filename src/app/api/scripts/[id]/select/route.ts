import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;

    const { data: script, error: fetchError } = await supabase
      .from("scripts")
      .select("project_id")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    await supabase
      .from("scripts")
      .update({ is_selected: false })
      .eq("project_id", script.project_id);
    const { data: selected, error } = await supabase
      .from("scripts")
      .update({ is_selected: true })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ script: selected });
  } catch (error) {
    await logError("scripts.select", error);
    return apiErrorResponse(error);
  }
}
