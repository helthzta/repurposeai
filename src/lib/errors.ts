import { createAdminClient } from "@/lib/supabase/admin";

/** Admin Feature: error logging. Never throws — a logging failure must not break the request. */
export async function logError(
  scope: string,
  error: unknown,
  opts: { userId?: string; metadata?: Record<string, unknown> } = {},
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${scope}]`, message);

  try {
    const admin = createAdminClient();
    await admin.from("error_logs").insert({
      user_id: opts.userId ?? null,
      scope,
      message,
      stack,
      metadata: opts.metadata ?? null,
    });
  } catch (loggingError) {
    console.error("[errors] failed to write error_logs row", loggingError);
  }
}
