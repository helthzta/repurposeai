import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const POST = withLogger("uploads.confirm", async (req: NextRequest) => {
  const { supabase, user } = await requireUser();
  const body = await req.json();
  const { projectId, brandProfileId, kind, path, filename, mimeType, fileSizeBytes } = body as {
    projectId?: string;
    /** Scopes a "logo" confirm instead of projectId — a brand profile isn't tied to one project. */
    brandProfileId?: string;
    kind?: string;
    path?: string;
    filename?: string;
    mimeType?: string;
    fileSizeBytes?: number;
  };

  if (!kind || !path) throw new ApiError(400, "kind and path are required");

  // An avatar isn't a source video either — it updates the user's own profile row.
  if (kind === "avatar") {
    const {
      data: { publicUrl },
    } = supabase.storage.from("brand-logos").getPublicUrl(path);
    const { data: profile, error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ profile });
  }

  // The logo isn't a source video — it updates the brand profile directly.
  if (kind === "logo") {
    if (!brandProfileId) throw new ApiError(400, "brandProfileId is required");
    const { data: brandProfile, error } = await supabase
      .from("brand_profiles")
      .update({ logo_path: path })
      .eq("id", brandProfileId)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ brandProfile });
  }

  if (!projectId) throw new ApiError(400, "projectId is required");

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
