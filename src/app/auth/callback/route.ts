import { NextResponse } from "next/server";
import { logError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** Exchanges the Supabase OAuth (Google) code for a session, then sends the user to the dashboard. */
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

  return NextResponse.redirect(`${origin}/dashboard`);
}
