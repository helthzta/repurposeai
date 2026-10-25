import { NextResponse } from "next/server";
import { ApiError } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { audit, requireAdmin } from "@/lib/admin-auth";

/** Toggle a submission between "new" and "responded" from the admin dashboard. */
export const PATCH = withLogger(
  "admin.contact-submissions.update",
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { admin, db } = await requireAdmin(request);
    const { id } = await params;
    const { status } = (await request.json().catch(() => ({}))) as { status?: string };

    if (status !== "new" && status !== "responded") {
      throw new ApiError(400, 'status must be "new" or "responded"');
    }

    const { data: submission, error } = await db
      .from("contact_submissions")
      .update({ status })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!submission) throw new ApiError(404, "Submission not found");
    await audit("contact.status_changed", {
      adminId: admin.id,
      targetType: "contact_submission",
      targetId: id,
      metadata: { status },
    });

    return NextResponse.json({ submission });
  },
);
