import { createAdminClient } from "@/lib/supabase/admin";

// Server-only (service-role key) — kept apart from credits.ts, whose cost math is imported by
// client components.
// Every balance change goes through the service-role client: spend_credits takes any user id and
// any signed amount, so it must not be callable with a browser-held key (migration 0004 revokes
// that). Callers pass a userId they got from requireUser()/requireAdmin(), never from the client.
async function adjustCredits(
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
) {
  const { data, error } = await createAdminClient().rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference_type: referenceType ?? null,
    p_reference_id: referenceId ?? null,
  });

  if (error) {
    if (error.message.includes("insufficient_credits")) {
      throw new Error("insufficient_credits");
    }
    throw error;
  }

  return data as number;
}

/** Throws "insufficient_credits" if the balance would go negative. */
export function spendCredits(
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
) {
  return adjustCredits(userId, -Math.abs(amount), reason, referenceType, referenceId);
}

export function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
) {
  return adjustCredits(userId, Math.abs(amount), reason, referenceType, referenceId);
}

/** Admin-only signed adjustment (grant or deduct) — see PATCH /api/admin/users/[id]. */
export function adminAdjustCredits(userId: string, delta: number) {
  return adjustCredits(userId, delta, "admin_adjustment");
}
