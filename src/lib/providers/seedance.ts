import type { PollResult, SubmitParams, VideoProvider } from "./types";

const REPLICATE_API = "https://api.replicate.com/v1";

// bytedance/seedance-2.0-fast hard limit — verified against the model's live
// OpenAPI schema (GET /v1/models/bytedance/seedance-2.0-fast), not guessed.
const MAX_DURATION_SECONDS = 15;

// The model only exposes two resolution tiers; "ultra" shares the "high" ceiling.
// ponytail: no 1080p tier exists on this model yet, ceiling is 720p.
const RESOLUTION_BY_QUALITY: Record<SubmitParams["quality"], "480p" | "720p"> = {
  standard: "480p",
  high: "720p",
  ultra: "720p",
};

/**
 * bytedance/seedance-2.0-fast on Replicate — https://replicate.com/bytedance/seedance-2.0-fast
 */
class SeedanceProvider implements VideoProvider {
  private get mocked() {
    return process.env.MOCK_PROVIDERS === "true";
  }

  private get token() {
    return process.env.REPLICATE_API_TOKEN;
  }

  async submit(params: SubmitParams): Promise<{ jobId: string }> {
    if (this.mocked) {
      return { jobId: `mock_${Date.now()}_${Math.round(Math.random() * 1e6)}` };
    }

    if (!this.token) throw new Error("Missing REPLICATE_API_TOKEN");

    if (params.durationSeconds > MAX_DURATION_SECONDS) {
      throw new Error(
        `Seedance 2.0 Fast supports at most ${MAX_DURATION_SECONDS}s per generation — choose a shorter duration.`,
      );
    }

    const res = await fetch(`${REPLICATE_API}/models/bytedance/seedance-2.0-fast/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt: params.prompt,
          duration: params.durationSeconds,
          resolution: RESOLUTION_BY_QUALITY[params.quality],
          aspect_ratio: params.aspectRatio,
        },
      }),
    });

    if (!res.ok) throw new Error(`Replicate submit failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { jobId: data.id };
  }

  async poll(jobId: string): Promise<PollResult> {
    if (this.mocked) {
      return jobId.startsWith("mock_")
        ? { status: "completed" }
        : { status: "failed", error: "unknown mock job" };
    }

    if (!this.token) throw new Error("Missing REPLICATE_API_TOKEN");

    const res = await fetch(`${REPLICATE_API}/predictions/${jobId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) throw new Error(`Replicate poll failed: ${res.status} ${await res.text()}`);
    const data = await res.json();

    if (data.status === "succeeded") {
      return { status: "completed", outputUrl: data.output as string };
    }
    if (data.status === "failed" || data.status === "canceled") {
      return { status: "failed", error: data.error ?? "generation failed" };
    }
    return { status: "processing" };
  }
}

export const seedanceProvider = new SeedanceProvider();
