import { NextResponse } from "next/server";
import { editScript } from "@/lib/ai/gemini";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;
    const { instruction } = await request.json();
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
  } catch (error) {
    await logError("scripts.assist", error);
    return apiErrorResponse(error);
  }
}
