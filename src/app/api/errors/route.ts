import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

/** Best-effort client-side error reporting (see src/app/error.tsx). Never fails the caller. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await logError(body.scope ?? "client", body.message ?? "Unknown client error", {
      userId: user?.id,
      metadata: { stack: body.stack, url: body.url },
    });
  } catch {
    // swallow — error reporting must never itself throw to the caller
  }

  return NextResponse.json({ ok: true });
}
