import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const GET = withLogger(
  "projects.get",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
  },
);

export const DELETE = withLogger(
  "projects.delete",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
  },
);
