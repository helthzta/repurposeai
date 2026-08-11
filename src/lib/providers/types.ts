import type { AspectRatio, Quality } from "@/lib/types";

export interface SubmitParams {
  prompt: string;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  quality: Quality;
  /** Reference image URLs (currently just the brand logo) the provider should ground on-screen branding in, if it supports it. */
  referenceImageUrls?: string[];
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
   * past this rather than chaining.
   */
  maxClipDurationSeconds: number;
  submit(params: SubmitParams): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<PollResult>;
}

export class NotImplementedError extends Error {}
