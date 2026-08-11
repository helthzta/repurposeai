import type { PollResult, SubmitParams, VideoProvider } from "./types";

const OPENROUTER_API = "https://openrouter.ai/api/v1";
// seedance-2.0-fast tops out at 15s — 2.5 is the model that actually supports native 30s
// (verified against OpenRouter's /api/v1/videos/models: supported_durations is 4-30 for 2.5,
// 4-15 for 2.0-fast). Don't downgrade this without also dropping maxClipDurationSeconds below.
const MODEL = "bytedance/seedance-2.5";

// The model only exposes two resolution tiers; "ultra" shares the "high" ceiling.
// ponytail: no 1080p tier exists on this model yet, ceiling is 720p.
const RESOLUTION_BY_QUALITY: Record<SubmitParams["quality"], "480p" | "720p"> = {
  standard: "480p",
  high: "720p",
  ultra: "720p",
};

/**
 * bytedance/seedance-2.5 via OpenRouter's video generation API —
 * https://openrouter.ai/docs/guides/overview/multimodal/video-generation
 */
class SeedanceProvider implements VideoProvider {
  // Seedance 2.5 supports native clips up to 30s in a single call (see MODEL comment above).
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

    // NOTE: no image-conditioned branding here (deliberately) — 2.5's only single-image anchor
    // is frame_images/first_frame (last_frame alone 400s: "last frame image content cannot be
    // mixed with first frame or reference image content"; 2.0-fast's input_references isn't in
    // 2.5's supported params at all per /api/v1/videos/models). And first_frame conditioning is
    // itself incompatible with an explicit aspect_ratio: the API 400s with "the output ratio
    // follows the first-frame image" whenever both are sent together — on *every* generation,
    // regardless of duration, once a brand logo is attached. Since aspect_ratio is a real,
    // user-facing setting (GenerateStep's Aspect Ratio picker) that has to keep working, we drop
    // image conditioning entirely rather than let it silently override the user's choice — the
    // brand logo still gets described in the text prompt's FINAL FRAME beat (masterScriptPrompt),
    // it's just not pixel-grounded in the actual uploaded image anymore.
    const res = await fetch(`${OPENROUTER_API}/videos`, {
      method: "POST",
      headers: { ...this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: params.prompt,
        duration: params.durationSeconds,
        resolution: RESOLUTION_BY_QUALITY[params.quality],
        aspect_ratio: params.aspectRatio,
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
