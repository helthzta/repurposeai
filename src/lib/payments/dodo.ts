import DodoPayments from "dodopayments";

/**
 * Server-only Dodo Payments client. `environment` controls which of Dodo's two base URLs
 * (test.dodopayments.com / live.dodopayments.com) requests go to — defaults to test_mode so a
 * missing env var fails safe (can't accidentally take a live charge).
 */
export function createDodoClient() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error("Missing DODO_PAYMENTS_API_KEY");

  return new DodoPayments({
    bearerToken: apiKey,
    environment:
      (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode" | undefined) ??
      "test_mode",
  });
}
