import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const POST = withLogger(
  "scripts.select",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
  },
);
