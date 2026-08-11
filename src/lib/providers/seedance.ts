import type { PollResult, SubmitParams, VideoProvider } from "./types";

const OPENROUTER_API = "https://openrouter.ai/api/v1";
const MODEL = "bytedance/seedance-2.0-fast";

// The model only exposes two resolution tiers; "ultra" shares the "high" ceiling.
// ponytail: no 1080p tier exists on this model yet, ceiling is 720p.
const RESOLUTION_BY_QUALITY: Record<SubmitParams["quality"], "480p" | "720p"> = {
  standard: "480p",
  high: "720p",
  ultra: "720p",
};

/**
 * bytedance/seedance-2.0-fast via OpenRouter's video generation API —
 * https://openrouter.ai/docs/guides/overview/multimodal/video-generation
 */
class SeedanceProvider implements VideoProvider {
  // Seedance now supports native 30s generation on OpenRouter — submit() already forwards
  // durationSeconds straight through as `duration` below, so no other changes were needed.
  maxClipDurationSeconds = 30;

  private get mocked() {
    return process.env.MOCK_PROVIDERS === "true";
  }

  private get apiKey() {
    return process.env.OPENROUTER_API_KEY;
  }

  private get authHeader() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async submit(params: SubmitParams): Promise<{ jobId: string }> {
    if (this.mocked) {
      return { jobId: `mock_${Date.now()}_${Math.round(Math.random() * 1e6)}` };
    }

    if (!this.apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const res = await fetch(`${OPENROUTER_API}/videos`, {
      method: "POST",
      headers: { ...this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: params.prompt,
        duration: params.durationSeconds,
        resolution: RESOLUTION_BY_QUALITY[params.quality],
        aspect_ratio: params.aspectRatio,
        // Reference-to-video: grounds on-screen branding (the script's FINAL FRAME logo shot) in
        // the brand's actual logo image instead of the model inventing one from the text prompt.
        // https://openrouter.ai/docs/guides/overview/multimodal/video-generation
        ...(params.referenceImageUrls?.length
          ? {
              input_references: params.referenceImageUrls.map((url) => ({
                type: "image_url",
                image_url: { url },
              })),
            }
          : {}),
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter submit failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { jobId: data.id };
  }

  async poll(jobId: string): Promise<PollResult> {
    if (this.mocked) {
      return jobId.startsWith("mock_")
        ? { status: "completed" }
        : { status: "failed", error: "unknown mock job" };
    }

    if (!this.apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const res = await fetch(`${OPENROUTER_API}/videos/${jobId}`, {
      headers: this.authHeader,
    });

    if (!res.ok) throw new Error(`OpenRouter poll failed: ${res.status} ${await res.text()}`);
    const data = await res.json();

    if (data.status === "completed") {
      const outputUrl = data.unsigned_urls?.[0];
      if (!outputUrl) return { status: "failed", error: "no video output returned" };
      // unsigned_urls point back at the OpenRouter API and need the same bearer token to fetch.
      return { status: "completed", outputUrl, outputHeaders: this.authHeader };
    }
    if (data.status === "failed") {
      return { status: "failed", error: data.error ?? "generation failed" };
    }
    return { status: "processing" };
  }
}

export const seedanceProvider = new SeedanceProvider();
