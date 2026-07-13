import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data: projects, error } = await supabase
      .from("projects")
      .select(
        "*, brand_profiles(*), generations(id, output_url, output_path, status, duration_seconds, provider, created_at)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ projects });
  } catch (error) {
    await logError("projects.list", error);
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();

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
        tone: body.tone ?? null,
        description: body.description ?? null,
        brand_colors: body.brandColors ?? null,
        cta: body.cta ?? null,
      })
      .select()
      .single();
    if (brandError) throw brandError;

    return NextResponse.json({ project, brandProfile });
  } catch (error) {
    await logError("projects.create", error);
    return apiErrorResponse(error);
  }
}
