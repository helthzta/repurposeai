import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const POST = withLogger(
  "projects.duplicate",
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { data: source, error: sourceError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (sourceError) throw sourceError;

    // Brand profiles are reusable now — a duplicate just points at the same one,
    // nothing to copy.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: `${source.name} (copy)`,
        status: "draft",
        brand_profile_id: source.brand_profile_id,
      })
      .select()
      .single();
    if (projectError) throw projectError;

    return NextResponse.json({ project });
  },
  { rateLimit: { limit: 20, windowMs: 60_000 } },
);
