import { type NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

const ALLOWED_KINDS = ["competitor", "product", "brand"] as const;
const MAX_BYTES = 500 * 1024 * 1024;

/** Alternative to a file upload — fetches a video from a URL server-side, same as file uploads land in source-videos. */
export const POST = withLogger(
  "uploads.from-link",
  async (req: NextRequest) => {
    const { supabase, user } = await requireUser();
    const { projectId, kind, url } = (await req.json()) as {
      projectId?: string;
      kind?: string;
      url?: string;
    };

    if (!projectId || !kind || !url)
      throw new ApiError(400, "projectId, kind and url are required");
    if (!ALLOWED_KINDS.includes(kind as (typeof ALLOWED_KINDS)[number]))
      throw new ApiError(400, `Unsupported kind: ${kind}`);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ApiError(400, "Invalid video URL");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      throw new ApiError(400, "Video URL must be http or https");

    const videoRes = await fetch(parsed.toString());
    if (!videoRes.ok) throw new ApiError(400, `Could not download video: ${videoRes.status}`);

    const mimeType = videoRes.headers.get("content-type") || "video/mp4";
    if (!mimeType.startsWith("video/")) {
      throw new ApiError(
        400,
        `That link didn't return a video file (got "${mimeType}"). Paste a direct link to the ` +
          "video file itself (e.g. ending in .mp4), not a YouTube/webpage link.",
      );
    }

    const bytes = Buffer.from(await videoRes.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new ApiError(400, "Video is larger than the 500MB limit");

    const ext = mimeType.includes("/") ? mimeType.split("/")[1].split(";")[0] : "mp4";
    const path = `${user.id}/${projectId}/${kind}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("source-videos")
      .upload(path, bytes, { contentType: mimeType });
    if (uploadError) throw uploadError;

    const { data: sourceVideo, error } = await supabase
      .from("source_videos")
      .insert({
        project_id: projectId,
        kind,
        storage_path: path,
        original_filename: null,
        mime_type: mimeType,
        file_size_bytes: bytes.length,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ sourceVideo });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
