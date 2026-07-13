import type { AspectRatio, BrandProfile, Quality, VideoAnalysis } from "@/lib/types";

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert ad strategist. Watch the uploaded advertisement video
carefully and deconstruct exactly why it works. Be specific and concrete — quote the actual hook line, name the
actual visual choices — never generic marketing platitudes.`;

export function scriptGenerationPrompt(analysis: VideoAnalysis, brand: BrandProfile) {
  return `You analyzed a competitor's advertisement with this breakdown:
${JSON.stringify(analysis, null, 2)}

Now write 3 completely different repurposed commercial scripts for this brand:
- Brand: ${brand.brand_name ?? "Unnamed brand"}
- Product/Service: ${brand.product_service ?? "n/a"}
- Target audience: ${brand.target_audience ?? "n/a"}
- Tone preference: ${brand.tone ?? "n/a"}
- Brand description: ${brand.description ?? "n/a"}
- Preferred CTA: ${brand.cta ?? "n/a"}

Reuse the winning marketing strategy and narrative structure you identified above, but rewrite it entirely for
this brand — never mention the original brand or reuse its exact wording. Produce exactly three scripts with
style "emotional", "humorous", and "high_conversion". Each needs: a title, a one-line hook, a full timestamped
scene-by-scene script (dialogue + visual direction), scene descriptions, emotional direction, a CTA, an estimated
duration in seconds, and the ISO 639-1 language code the script is written in.`;
}

export function scriptAssistPrompt(currentBody: string, instruction: string) {
  return `Here is the current commercial script:
"""
${currentBody}
"""

Apply this instruction and return the FULL revised script (not a diff, not commentary): "${instruction}".
Preserve everything about the script that the instruction doesn't ask you to change — keep the same scenes,
timestamps and structure unless the instruction implies otherwise.`;
}

export function videoPrompt(params: {
  scriptBody: string;
  brand: BrandProfile;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  quality: Quality;
  cameraStyle: string;
}) {
  const { scriptBody, brand, durationSeconds, aspectRatio, quality, cameraStyle } = params;
  return `Cinematic ${aspectRatio} ${cameraStyle} commercial for ${brand.brand_name ?? "the brand"}, ${durationSeconds}s,
${quality} quality. Brand colors: ${brand.brand_colors?.join(", ") ?? "brand default"}. Based on this script:
${scriptBody}`;
}

export function scorePrompt(scriptBody: string, brand: BrandProfile) {
  return `Score this commercial script for "${brand.brand_name ?? "the brand"}" on a 0-100 scale for each
dimension, based on how well it's likely to perform:

"""
${scriptBody}
"""

Dimensions: marketing_score, creativity_score, brand_match_score, emotional_impact, predicted_conversion.`;
}
