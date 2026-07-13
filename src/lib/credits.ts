import type { SupabaseClient } from "@supabase/supabase-js";
import type { AspectRatio, Quality } from "@/lib/types";

// Credits per second of rendered video, by quality tier.
const CREDIT_RATE: Record<Quality, number> = {
  standard: 0.7,
  high: 1,
  ultra: 1.4,
};

export function costFor(durationSeconds: number, quality: Quality) {
  return Math.max(1, Math.ceil(durationSeconds * CREDIT_RATE[quality]));
}

// ponytail: aspect ratio doesn't affect render cost today, kept for future tiering.
export function costForGeneration(
  durationSeconds: number,
  quality: Quality,
  _aspectRatio: AspectRatio,
) {
  return costFor(durationSeconds, quality);
}

/** Throws (via the spend_credits Postgres function) if the balance would go negative. */
export async function spendCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
) {
  const { data, error } = await supabase.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: -Math.abs(amount),
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

export async function refundCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
) {
  const { data, error } = await supabase.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: Math.abs(amount),
    p_reason: reason,
    p_reference_type: referenceType ?? null,
    p_reference_id: referenceId ?? null,
  });

  if (error) throw error;
  return data as number;
}
