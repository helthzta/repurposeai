import type { PollResult, SubmitParams, VideoProvider } from "./types";

/**
 * ponytail: the real HTTP calls are pending a host decision (BytePlus/Volcengine
 * ModelArk, fal.ai, or Replicate all serve Seedance with different request shapes).
 * Until SEEDANCE_API_BASE_URL/SEEDANCE_API_KEY are set, MOCK_PROVIDERS short-circuits
 * to a canned "completed" result so the rest of the pipeline (credits, storage,
 * insights, UI polling) is fully exercisable today. Fill in the fetch calls below
 * once the host is chosen — see SETUP.md.
 */
class SeedanceProvider implements VideoProvider {
  private get mocked() {
    return process.env.MOCK_PROVIDERS === "true" || !process.env.SEEDANCE_API_KEY;
  }

  async submit(params: SubmitParams): Promise<{ jobId: string }> {
    if (this.mocked) {
      return { jobId: `mock_${Date.now()}_${Math.round(Math.random() * 1e6)}` };
    }

    const res = await fetch(`${process.env.SEEDANCE_API_BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SEEDANCE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: params.prompt,
        duration: params.durationSeconds,
        aspect_ratio: params.aspectRatio,
        quality: params.quality,
      }),
    });

    if (!res.ok) throw new Error(`Seedance submit failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { jobId: data.id };
  }

  async poll(jobId: string): Promise<PollResult> {
    if (this.mocked) {
      return jobId.startsWith("mock_")
        ? { status: "completed" }
        : { status: "failed", error: "unknown mock job" };
    }

    const res = await fetch(`${process.env.SEEDANCE_API_BASE_URL}/tasks/${jobId}`, {
      headers: { Authorization: `Bearer ${process.env.SEEDANCE_API_KEY}` },
    });

    if (!res.ok) throw new Error(`Seedance poll failed: ${res.status} ${await res.text()}`);
    const data = await res.json();

    if (data.status === "succeeded") return { status: "completed", outputUrl: data.output_url };
    if (data.status === "failed")
      return { status: "failed", error: data.error ?? "generation failed" };
    return { status: "processing" };
  }
}

export const seedanceProvider = new SeedanceProvider();
