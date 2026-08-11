import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase's query builder resolves `{ data, error }` with a plain `{ message, details, hint,
 * code }` object on failure — it's never actually a real `Error` instance unless you opt into
 * `.throwOnError()` (we don't). Our routes do `if (error) throw error;` everywhere, so that
 * plain object is what ends up here. `error instanceof Error` is false for it, so falling back
 * to `String(error)` silently discards the real message and logs "[object Object]" instead —
 * this pulls `.message` off any error-shaped object before giving up.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Admin Feature: error logging. Never throws — a logging failure must not break the request. */
export async function logError(
  scope: string,
  error: unknown,
  opts: { userId?: string; metadata?: Record<string, unknown> } = {},
) {
  const message = errorMessage(error);
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
