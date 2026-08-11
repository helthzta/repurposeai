import { NextResponse } from "next/server";
import { logError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the Supabase OAuth (Google) code for a session, then sends the user to their profile.
 * Shared by both the Login and Signup pages' "Continue with Google" buttons — Supabase doesn't
 * distinguish sign-in from sign-up for OAuth, so this one redirect target covers both.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      await logError("auth.callback", error);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/profile`);
}
