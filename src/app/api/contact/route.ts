import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public contact-us submission — no login required (the Custom plan's CTA on /credits is the
 * main entry point, but the /contact page itself is reachable signed out, same as /terms etc.).
 * Writes go through the service-role client since contact_submissions has no RLS policy for an
 * anon/authenticated insert (see that migration's comment) — same pattern as error_logs.
 */
export const POST = withLogger(
  "contact.submit",
  async (req: NextRequest) => {
    const { name, email, message, planInterest } = (await req.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      message?: string;
      planInterest?: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      throw new ApiError(400, "name, email, and message are required");
    }
    if (!EMAIL_RE.test(email.trim())) throw new ApiError(400, "Enter a valid email address");

    // Best-effort only — attach the submitter's user id when they happen to be signed in, never
    // require it.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const { error } = await admin.from("contact_submissions").insert({
      user_id: user?.id ?? null,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      plan_interest: planInterest?.trim() || null,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true }, { status: 201 });
  },
  { rateLimit: { limit: 5, windowMs: 60_000 * 60 } },
);
