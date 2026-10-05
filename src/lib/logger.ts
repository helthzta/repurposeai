/**
 * Structured request/response logger for API route handlers.
 *
 * Usage:
 *   import { withLogger } from "@/lib/logger";
 *
 *   export const POST = withLogger("uploads.sign", async (req) => {
 *     ...
 *     return NextResponse.json({ ... });
 *   });
 *
 * Every request logs:
 *   → [METHOD] /path  (on entry)
 *   ← [METHOD] /path  NNNms  STATUS  (on exit or error)
 *
 * Errors are also forwarded to logError() so they land in the error_logs table.
 */

import { type NextRequest, NextResponse } from "next/server";
import { errorMessage, logError } from "@/lib/errors";
import { ApiError, apiErrorResponse } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Next's generated route types require every handler's second argument to carry `params`, even
// on routes with no dynamic segment — hence the default.
type DefaultRouteCtx = { params: Promise<Record<string, string>> };
type RouteHandler<T extends object = DefaultRouteCtx> = (
  req: NextRequest,
  ctx: T,
) => Promise<NextResponse>;

function timestamp() {
  return new Date().toISOString();
}

function colorStatus(status: number) {
  if (status < 300) return `\x1b[32m${status}\x1b[0m`;
  if (status < 400) return `\x1b[33m${status}\x1b[0m`;
  return `\x1b[31m${status}\x1b[0m`;
}

/** Baseline per-IP rate limit applied to every route unless overridden — generous enough not to bother normal usage. */
const DEFAULT_RATE_LIMIT = { limit: 120, windowMs: 60_000 };

/**
 * Wraps a Next.js route handler with structured request/response logging and
 * a baseline rate limit (see src/lib/rate-limit.ts). Endpoints that call
 * external AI/video APIs should pass a tighter `rateLimit` here, or call
 * `rateLimit()` themselves after auth to key by user id instead of IP.
 *
 * @param scope   Human-readable name used in logs and error_logs.scope ("uploads.sign")
 * @param handler The actual async handler function.
 */
export function withLogger<T extends object = DefaultRouteCtx>(
  scope: string,
  handler: RouteHandler<T>,
  options?: { rateLimit?: { limit: number; windowMs: number } },
): RouteHandler<T> {
  return async (req: NextRequest, ctx: T) => {
    const start = Date.now();
    const method = req.method;
    const pathname = req.nextUrl.pathname;

    console.log(`\x1b[36m→\x1b[0m [${timestamp()}] [${scope}] ${method} ${pathname}`);

    try {
      rateLimit(req, scope, options?.rateLimit ?? DEFAULT_RATE_LIMIT);
      const response = await handler(req, ctx);
      const elapsed = Date.now() - start;
      const status = response.status;

      console.log(
        `\x1b[36m←\x1b[0m [${timestamp()}] [${scope}] ${method} ${pathname} ${elapsed}ms ${colorStatus(status)}`,
      );

      return response;
    } catch (error) {
      const elapsed = Date.now() - start;
      const message = errorMessage(error);
      const status = error instanceof ApiError ? error.status : 500;

      console.error(
        `\x1b[31m✗\x1b[0m [${timestamp()}] [${scope}] ${method} ${pathname} ${elapsed}ms ${colorStatus(status)} — ${message}`,
      );

      await logError(scope, error);
      return apiErrorResponse(error);
    }
  };
}

/**
 * Lightweight logger for non-route contexts (background jobs, lib functions).
 */
export const logger = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) => {
    const extra = meta ? ` ${JSON.stringify(meta)}` : "";
    console.log(`\x1b[32m•\x1b[0m [${timestamp()}] [${scope}] ${message}${extra}`);
  },
  warn: (scope: string, message: string, meta?: Record<string, unknown>) => {
    const extra = meta ? ` ${JSON.stringify(meta)}` : "";
    console.warn(`\x1b[33m⚠\x1b[0m [${timestamp()}] [${scope}] ${message}${extra}`);
  },
  error: (scope: string, message: string, meta?: Record<string, unknown>) => {
    const extra = meta ? ` ${JSON.stringify(meta)}` : "";
    console.error(`\x1b[31m✗\x1b[0m [${timestamp()}] [${scope}] ${message}${extra}`);
  },
};
