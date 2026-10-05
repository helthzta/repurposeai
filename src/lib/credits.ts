import type { AspectRatio, Quality } from "@/lib/types";

// Credits per second of rendered video, by quality tier. Split by duration because duration now
// determines the underlying Seedance model (src/lib/providers/seedance.ts's modelFor) and the two
// models don't cost the same on OpenRouter: 2.0-fast (15s) runs ~$0.04/s vs 2.5 (30s) at ~$0.10/s,
// roughly a 0.4x ratio — the 15s rate below is the 30s rate scaled by that ratio and rounded.
const CREDIT_RATE_30S: Record<Quality, number> = {
  standard: 0.7,
  high: 1,
  ultra: 1.4,
};
const CREDIT_RATE_15S: Record<Quality, number> = {
  standard: 0.3,
  high: 0.4,
  ultra: 0.6,
};

export function costFor(durationSeconds: number, quality: Quality) {
  const rate = durationSeconds === 15 ? CREDIT_RATE_15S : CREDIT_RATE_30S;
  return Math.max(1, Math.ceil(durationSeconds * rate[quality]));
}

// ponytail: aspect ratio doesn't affect render cost today, kept for future tiering.
export function costForGeneration(
  durationSeconds: number,
  quality: Quality,
  _aspectRatio: AspectRatio,
) {
  return costFor(durationSeconds, quality);
}
