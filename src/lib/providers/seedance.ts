import type { PollResult, SubmitParams, VideoProvider } from "./types";

const OPENROUTER_API = "https://openrouter.ai/api/v1";

// Routed by duration, not a single constant: seedance-2.0-fast tops out at 15s (and is
// meaningfully cheaper on OpenRouter, ~$0.04/s vs ~$0.10/s), 2.5 is the model that actually
// supports native 30s (verified against OpenRouter's /api/v1/videos/models: supported_durations
// is 4-30 for 2.5, 4-15 for 2.0-fast). 30 stays the fallback for any duration that isn't
// exactly 15, matching maxClipDurationSeconds below.
// Exception: 15s "ultra" goes to seedance-2.0 (non-fast), the only one of the three with a real
// 1080p tier (supported_resolutions 480p/720p/1080p/4K, durations 4-15).
function modelFor(durationSeconds: number, quality: SubmitParams["quality"]) {
  if (durationSeconds !== 15) return "bytedance/seedance-2.5";
  return quality === "ultra" ? "bytedance/seedance-2.0" : "bytedance/seedance-2.0-fast";
}

// ponytail: 2.5 has no 1080p tier, so a 30s "ultra" still renders 720p; switch it here when
// a 30s-capable model gains 1080p.
function resolutionFor(durationSeconds: number, quality: SubmitParams["quality"]) {
  if (quality === "standard") return "480p";
  return quality === "ultra" && durationSeconds === 15 ? "1080p" : "720p";
}

/**
 * Seedance via OpenRouter's video generation API — 2.0-fast for 15s clips (2.0 for 15s
 * 1080p), 2.5 for 30s (see modelFor above) — https://openrouter.ai/docs/guides/overview/multimodal/video-generation
 */
class SeedanceProvider implements VideoProvider {
  // Seedance 2.5 (the 30s model) supports native clips up to 30s in a single call; 2.0-fast (the
  // 15s model) tops out at 15s but nothing above 15s reaches it anyway (see modelFor above).
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
    // FLAG: now that 15s clips route to 2.0-fast (which per the note above *does* support
    // input_references, unlike 2.5), 15s generations could regain real logo-image grounding via
    // params.referenceImageUrls without hitting 2.5's aspect_ratio conflict. Left off deliberately
    // for this change — model routing only, per the spec — needs its own decision/verification.
    const res = await fetch(`${OPENROUTER_API}/videos`, {
      method: "POST",
      headers: { ...this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelFor(params.durationSeconds, params.quality),
        prompt: params.prompt,
        duration: params.durationSeconds,
        resolution: resolutionFor(params.durationSeconds, params.quality),
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
