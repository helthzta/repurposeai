import type { AspectRatio, Quality } from "@/lib/types";

export interface SubmitParams {
  prompt: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  quality: Quality;
}

export interface PollResult {
  status: "processing" | "completed" | "failed";
  outputUrl?: string;
  /** Headers required to fetch outputUrl — set when the provider's download endpoint needs auth (e.g. OpenRouter). */
  outputHeaders?: Record<string, string>;
  error?: string;
}

/** The abstraction that lets a new video model be added without touching the generation route. */
export interface VideoProvider {
  /**
   * Longest single clip this provider can render in one call — generation.ts rejects anything
   * past this rather than chaining (chaining was removed once Seedance's native 30s call
   * became relevant; see seedance.ts for the TODO on bumping this once that's wired up).
   */
  maxClipDurationSeconds: number;
  submit(params: SubmitParams): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<PollResult>;
}

export class NotImplementedError extends Error {}
