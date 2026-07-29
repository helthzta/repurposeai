import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
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

export const POST = withLogger("projects.create", async (req: NextRequest) => {
  const { supabase, user } = await requireUser();
  const body = await req.json();

  const name = body.brandName?.trim() || "Untitled commercial";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name })
    .select()
    .single();
  if (projectError) throw projectError;

  const { data: brandProfile, error: brandError } = await supabase
    .from("brand_profiles")
    .insert({
      project_id: project.id,
      brand_name: body.brandName ?? null,
      product_service: body.productService ?? null,
      target_audience: body.targetAudience ?? null,
      description: body.description ?? null,
      brand_colors: body.brandColors ?? null,
    })
    .select()
    .single();
  if (brandError) throw brandError;

  return NextResponse.json({ project, brandProfile }, { status: 201 });
});
