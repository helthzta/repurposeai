import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { data: project, error } = await supabase
      .from("projects")
      .select(
        `*, brand_profiles(*), source_videos(*),
         video_analyses(*),
         scripts(*),
         generations(*)`,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error) throw error;

    return NextResponse.json({ project });
  } catch (error) {
    await logError("projects.get", error);
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;

    // Storage cleanup is best-effort — the DB row (source of truth) is already gone.
    for (const bucket of ["source-videos", "generated-videos"]) {
      const { data: files } = await supabase.storage.from(bucket).list(`${user.id}/${id}`);
      if (files?.length) {
        await supabase.storage.from(bucket).remove(files.map((f) => `${user.id}/${id}/${f.name}`));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logError("projects.delete", error);
    return apiErrorResponse(error);
  }
}
