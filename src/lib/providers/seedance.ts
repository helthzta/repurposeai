import type { PollResult, SubmitParams, VideoProvider } from "./types";

/**
 * Uses OpenRouter's unified video generation API to call the Seedance 2.0 model.
 */
class SeedanceProvider implements VideoProvider {
  private get mocked() {
    return process.env.MOCK_PROVIDERS === "true";
  }

  private get apiKey() {
    return process.env.OPENROUTER_API_KEY || process.env.SEEDANCE_API_KEY;
  }

  async submit(params: SubmitParams): Promise<{ jobId: string }> {
    if (this.mocked) {
      return { jobId: `mock_${Date.now()}_${Math.round(Math.random() * 1e6)}` };
    }

    if (!this.apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY or SEEDANCE_API_KEY");
    }

    const res = await fetch("https://openrouter.ai/api/v1/videos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "bytedance/seedance-2.0-fast",
        prompt: params.prompt,
        duration: params.durationSeconds,
        aspect_ratio: params.aspectRatio,
        // Maps quality to resolution
        resolution: params.quality === "ultra" ? "1080p" : "720p",
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter submit failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    
    // OpenRouter returns an `id` or `generation_id`
    return { jobId: data.id || data.generation_id };
  }

  async poll(jobId: string): Promise<PollResult> {
    if (this.mocked) {
      return jobId.startsWith("mock_")
        ? { status: "completed" }
        : { status: "failed", error: "unknown mock job" };
    }

    const res = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) throw new Error(`OpenRouter poll failed: ${res.status} ${await res.text()}`);
    const data = await res.json();

    if (data.status === "completed") {
      const outputUrl = data.unsigned_urls?.[0] || data.content_url;
      return { status: "completed", outputUrl };
    }
    
    if (data.status === "failed") {
      return { status: "failed", error: data.error ?? "generation failed" };
    }
    
    return { status: "processing" };
  }
}

export const seedanceProvider = new SeedanceProvider();
