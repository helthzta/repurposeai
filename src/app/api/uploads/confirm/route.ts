import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const POST = withLogger("uploads.confirm", async (req: NextRequest) => {
  const { supabase } = await requireUser();
  const body = await req.json();
  const { projectId, kind, path, filename, mimeType, fileSizeBytes } = body as {
    projectId?: string;
    kind?: string;
    path?: string;
    filename?: string;
    mimeType?: string;
    fileSizeBytes?: number;
  };

  if (!projectId || !kind || !path)
    throw new ApiError(400, "projectId, kind and path are required");

  const { data: sourceVideo, error } = await supabase
    .from("source_videos")
    .insert({
      project_id: projectId,
      kind,
      storage_path: path,
      original_filename: filename ?? null,
      mime_type: mimeType ?? null,
      file_size_bytes: fileSizeBytes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  return NextResponse.json({ sourceVideo });
});
