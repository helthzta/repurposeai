import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { data: source, error: sourceError } = await supabase
      .from("projects")
      .select("*, brand_profiles(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (sourceError) throw sourceError;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: `${source.name} (copy)`, status: "draft" })
      .select()
      .single();
    if (projectError) throw projectError;

    const brand = source.brand_profiles;
    if (brand) {
      await supabase.from("brand_profiles").insert({
        project_id: project.id,
        brand_name: brand.brand_name,
        product_service: brand.product_service,
        target_audience: brand.target_audience,
        tone: brand.tone,
        description: brand.description,
        brand_colors: brand.brand_colors,
        cta: brand.cta,
      });
    }

    return NextResponse.json({ project });
  } catch (error) {
    await logError("projects.duplicate", error);
    return apiErrorResponse(error);
  }
}
