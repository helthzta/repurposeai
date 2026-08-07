import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const PATCH = withLogger(
  "brand-profiles.update",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const body = await req.json();

    if (body.isDefault === true) {
      // Only one default per user — enforced here rather than a DB constraint (see 0019's
      // trailing note). Unset any existing default before this row becomes it.
      await supabase
        .from("brand_profiles")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }

    const update: Record<string, unknown> = {};
    if (body.label !== undefined) update.label = body.label;
    if (body.brandName !== undefined) update.brand_name = body.brandName;
    if (body.productService !== undefined) update.product_service = body.productService;
    if (body.targetAudience !== undefined) update.target_audience = body.targetAudience;
    if (body.description !== undefined) update.description = body.description;
    if (body.brandColors !== undefined) update.brand_colors = body.brandColors;
    if (body.logoPath !== undefined) update.logo_path = body.logoPath;
    // Full-array replace — used to drop a context image (uploading a new one instead goes
    // through /api/uploads/confirm, which appends).
    if (body.contextImagePaths !== undefined) update.context_image_paths = body.contextImagePaths;
    if (body.isDefault !== undefined) update.is_default = body.isDefault;

    const { data: brandProfile, error } = await supabase
      .from("brand_profiles")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ brandProfile });
  },
  { rateLimit: { limit: 20, windowMs: 60_000 } },
);

export const DELETE = withLogger(
  "brand-profiles.delete",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { data: deleted, error } = await supabase
      .from("brand_profiles")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    // Deleting the default profile leaves the user without one — promote whichever's newest.
    if (deleted.is_default) {
      const { data: next } = await supabase
        .from("brand_profiles")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (next) {
        await supabase.from("brand_profiles").update({ is_default: true }).eq("id", next.id);
      }
    }

    return NextResponse.json({ ok: true });
  },
);
