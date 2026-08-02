import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { signGenerationOutputs } from "@/lib/projects";
import type { Generation, Project } from "@/lib/types";

type ProjectListGeneration = Pick<
  Generation,
  | "id"
  | "output_url"
  | "output_path"
  | "status"
  | "duration_seconds"
  | "provider"
  | "credits_charged"
  | "created_at"
>;
type ProjectListRow = Project & { generations: ProjectListGeneration[] };

export const GET = withLogger("projects.list", async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "*, brand_profiles(*), generations(id, output_url, output_path, status, duration_seconds, provider, credits_charged, created_at)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const projects = (data ?? []) as ProjectListRow[];

  // output_url isn't a persisted column (signed URLs expire) — sign every project's
  // generations in one batch call rather than one round trip per project.
  const signed = await signGenerationOutputs(
    supabase,
    projects.flatMap((p) => p.generations ?? []),
  );
  const signedById = new Map(signed.map((g) => [g.id, g]));
  const withSignedUrls = projects.map((p) => ({
    ...p,
    generations: (p.generations ?? []).map((g) => signedById.get(g.id) ?? g),
  }));

  return NextResponse.json({ projects: withSignedUrls });
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
