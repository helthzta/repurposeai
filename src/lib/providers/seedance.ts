import type { PollResult, SubmitParams, VideoProvider } from "./types";

const MUAPI_API = "https://api.muapi.ai/api/v1";

// MuAPI selects resolution via endpoint slug, not a body param. 1080p exists in the
// pricing table but is "planned for a future update" per the docs — not callable yet.
// ponytail: ultra shares the "high" 720p ceiling until MuAPI ships 1080p.
const RESOLUTION_SUFFIX_BY_QUALITY: Record<SubmitParams["quality"], string> = {
  standard: "-480p",
  high: "",
  ultra: "",
};

/**
 * bytedance Seedance 2.5 via MuAPI — https://muapi.ai/docs/introduction
 * Submit-then-poll REST pattern: POST /api/v1/{model-slug}, GET /api/v1/predictions/{id}/result.
 */
class SeedanceProvider implements VideoProvider {
  // Seedance 2.5 supports native clips up to 30s (docs: "duration 4-30 seconds").
  maxClipDurationSeconds = 30;

  private get apiKey() {
    return process.env.MUAPI_API_KEY;
  }

  private get authHeader() {
    return { "x-api-key": this.apiKey! };
  }

  async submit(params: SubmitParams): Promise<{ jobId: string }> {
    if (!this.apiKey) throw new Error("Missing MUAPI_API_KEY");

    // Reference-to-video: grounds on-screen branding (the script's FINAL FRAME logo shot) in
    // the brand's actual logo image instead of the model inventing one from the text prompt.
    // MuAPI's image-to-video variant takes a single image_url, unlike OpenRouter's array — first wins.
    const imageUrl = params.referenceImageUrls?.[0];
    const model = `seedance-2.5-${imageUrl ? "image-to-video" : "text-to-video"}${RESOLUTION_SUFFIX_BY_QUALITY[params.quality]}`;

    const res = await fetch(`${MUAPI_API}/${model}`, {
      method: "POST",
      headers: { ...this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: params.prompt,
        duration: params.durationSeconds,
        aspect_ratio: params.aspectRatio,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      }),
    });

    if (!res.ok) throw new Error(`MuAPI submit failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { jobId: data.request_id };
  }

  async poll(jobId: string): Promise<PollResult> {
    if (!this.apiKey) throw new Error("Missing MUAPI_API_KEY");

    const res = await fetch(`${MUAPI_API}/predictions/${jobId}/result`, {
      headers: this.authHeader,
    });

    if (!res.ok) throw new Error(`MuAPI poll failed: ${res.status} ${await res.text()}`);
    const data = await res.json();

    if (data.status === "completed") {
      const outputUrl = data.outputs?.[0];
      if (!outputUrl) return { status: "failed", error: "no video output returned" };
      return { status: "completed", outputUrl };
    }
    if (data.status === "failed") {
      return { status: "failed", error: data.error ?? "generation failed" };
    }
    return { status: "processing" };
  }
}

export const seedanceProvider = new SeedanceProvider();
