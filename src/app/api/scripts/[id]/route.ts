import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

const EDITABLE_FIELDS = [
  "title",
  "hook",
  "body",
  "scene_descriptions",
  "emotional_direction",
  "cta",
  "estimated_duration",
] as const;

export const PATCH = withLogger(
  "scripts.update",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase } = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) patch[field] = body[field];
    }

    const { data: script, error } = await supabase
      .from("scripts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ script });
  },
);
