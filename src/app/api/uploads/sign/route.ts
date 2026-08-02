import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

const BUCKET_BY_KIND = {
  competitor: "source-videos",
  product: "source-videos",
  brand: "source-videos",
  logo: "brand-logos",
  avatar: "brand-logos",
} as const;

export const POST = withLogger("uploads.sign", async (req: NextRequest) => {
  const { supabase, user } = await requireUser();
  const body = await req.json();
  const { projectId, brandProfileId, kind, filename } = body as {
    projectId?: string;
    /** Scopes a "logo" upload instead of projectId — a brand profile isn't tied to one project. */
    brandProfileId?: string;
    kind?: string;
    filename?: string;
  };

  if (!kind || !filename) throw new ApiError(400, "kind and filename are required");
  if (!(kind in BUCKET_BY_KIND)) throw new ApiError(400, `Unsupported kind: ${kind}`);

  const bucket = BUCKET_BY_KIND[kind as keyof typeof BUCKET_BY_KIND];

  // Avatars are scoped to the user themselves — no project/brand-profile id to pass.
  let path: string;
  if (kind === "avatar") {
    path = `${user.id}/avatar/${Date.now()}-${filename}`;
  } else {
    const scopeId = kind === "logo" ? brandProfileId : projectId;
    if (!scopeId) {
      throw new ApiError(
        400,
        kind === "logo" ? "brandProfileId is required" : "projectId is required",
      );
    }
    path = `${user.id}/${scopeId}/${kind}-${Date.now()}-${filename}`;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw error;

  return NextResponse.json({ bucket, path, token: data.token });
});
