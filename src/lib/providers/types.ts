import type { AspectRatio, Quality } from "@/lib/types";

export interface SubmitParams {
  prompt: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  quality: Quality;
  /** A directly-downloadable image URL (no auth/cookies) to seed this clip as a continuation of a prior one. */
  seedImageUrl?: string;
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
  /** Longest single clip this provider can render in one call — generation.ts chains requests above this. */
  maxClipDurationSeconds: number;
  submit(params: SubmitParams): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<PollResult>;
}

export class NotImplementedError extends Error {}
