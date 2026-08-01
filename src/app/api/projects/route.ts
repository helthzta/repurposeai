import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("projects.list", async () => {
  const { supabase, user } = await requireUser();
  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      "*, brand_profiles(*), generations(id, output_url, output_path, status, duration_seconds, provider, credits_charged, created_at)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return NextResponse.json({ projects });
});

/** Brand details now live on a reusable brand_profiles row (see /api/brand-profiles) — a project just picks one. */
export const POST = withLogger("projects.create", async (req: NextRequest) => {
  const { supabase, user } = await requireUser();
  const body = await req.json();
  const brandProfileId: string | undefined = body.brandProfileId;
  if (!brandProfileId) throw new ApiError(400, "brandProfileId is required");

  const { data: brandProfile, error: brandError } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("id", brandProfileId)
    .eq("user_id", user.id)
    .single();
  if (brandError) throw new ApiError(404, "Brand profile not found");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: brandProfile.brand_name?.trim() || "Untitled commercial",
      brand_profile_id: brandProfileId,
    })
    .select()
    .single();
  if (projectError) throw projectError;

  return NextResponse.json({ project, brandProfile }, { status: 201 });
});
