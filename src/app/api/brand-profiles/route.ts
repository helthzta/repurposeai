import { type NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { fetchWebsiteText } from "@/lib/website";

/** A user's reusable brand profiles — created once, picked per project instead of re-entered every time. */
export const GET = withLogger("brand-profiles.list", async () => {
  const { supabase, user } = await requireUser();
  const { data: brandProfiles, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return NextResponse.json({ brandProfiles });
});

export const POST = withLogger(
  "brand-profiles.create",
  async (req: NextRequest) => {
    const { supabase, user } = await requireUser();
    const body = await req.json();
    const label: string | undefined = body.label?.trim();
    if (!label) throw new ApiError(400, "label is required");

    const { count } = await supabase
      .from("brand_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const websiteUrl: string | undefined = body.websiteUrl?.trim() || undefined;
    // Best-effort — a dead/slow site never fails profile creation, it just leaves
    // website_summary null and script prompts fall back to the other brand fields.
    const websiteSummary = websiteUrl ? await fetchWebsiteText(websiteUrl) : null;

    const { data: brandProfile, error } = await supabase
      .from("brand_profiles")
      .insert({
        user_id: user.id,
        label,
        brand_name: body.brandName ?? null,
        product_service: body.productService ?? null,
        target_audience: body.targetAudience ?? null,
        description: body.description ?? null,
        brand_colors: body.brandColors ?? null,
        website_url: websiteUrl ?? null,
        website_summary: websiteSummary,
        // A user's very first profile becomes their default automatically.
        is_default: (count ?? 0) === 0,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ brandProfile }, { status: 201 });
  },
  { rateLimit: { limit: 20, windowMs: 60_000 } },
);
