import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

const BUCKET_BY_KIND = {
  competitor: "source-videos",
  product: "source-videos",
  brand: "source-videos",
  logo: "brand-logos",
} as const;

export const POST = withLogger("uploads.sign", async (req: NextRequest) => {
  const { supabase, user } = await requireUser();
  const body = await req.json();
  const { projectId, kind, filename } = body as {
    projectId?: string;
    kind?: string;
    filename?: string;
  };

  if (!projectId || !kind || !filename)
    throw new ApiError(400, "projectId, kind and filename are required");
  if (!(kind in BUCKET_BY_KIND)) throw new ApiError(400, `Unsupported kind: ${kind}`);

  const bucket = BUCKET_BY_KIND[kind as keyof typeof BUCKET_BY_KIND];
  const path = `${user.id}/${projectId}/${kind}-${Date.now()}-${filename}`;

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw error;

  return NextResponse.json({ bucket, path, token: data.token });
});
