import { type NextRequest, NextResponse } from "next/server";
import { editScript } from "@/lib/ai/gemini";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const POST = withLogger(
  "scripts.assist",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase } = await requireUser();
    const { id } = await params;
    const { instruction } = await req.json();
    if (!instruction) throw new ApiError(400, "instruction is required");

    const { data: current, error: fetchError } = await supabase
      .from("scripts")
      .select("body")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const revisedBody = await editScript(current.body, instruction);

    const { data: script, error } = await supabase
      .from("scripts")
      .update({ body: revisedBody })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ script });
  },
);
