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
  error?: string;
}

/** The abstraction that lets a new video model be added without touching the generation route. */
export interface VideoProvider {
  submit(params: SubmitParams): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<PollResult>;
}

export class NotImplementedError extends Error {}
