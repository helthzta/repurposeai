import type { AspectRatio, BrandProfile, ScriptIdea, Quality, VideoAnalysis } from "@/lib/types";

export const ANALYSIS_SYSTEM_PROMPT = `You are a viral video analyst. Watch the uploaded video and figure out
exactly why it went viral — the hook, the pacing, the emotional arc, the pain it names and the relief it offers.
Be specific and concrete — quote the actual hook line, name the actual visual choices — never generic marketing
platitudes. "viral_factor" should be your single best explanation of the core reason this video spread.`;

/** Shared brand-context block — used by every script-writing prompt below. */
function brandBrief(brand: BrandProfile) {
  const website = brand.website_summary
    ? `\n- Brand website content (scanned from ${brand.website_url}):\n${brand.website_summary}`
    : "";
  return `- Brand: ${brand.brand_name ?? "Unnamed brand"}
- Product/Service: ${brand.product_service ?? "n/a"}
- Target audience: ${brand.target_audience ?? "n/a"}
- Brand description: ${brand.description ?? "n/a"}${website}`;
}

/** Tone is never asked of the user — it's carried over from what the analyzed video actually did. */
function toneNote(analysis: VideoAnalysis) {
  return `Match the tone of the original: ${analysis.tone_of_voice ?? "infer it from the analysis below"}. If the
original was funny, be funny; if it was earnest, stay earnest — don't default to a generic "commercial" tone.`;
}

export function scriptGenerationPrompt(analysis: VideoAnalysis, brand: BrandProfile) {
  return `You analyzed a video with this viral breakdown:
${JSON.stringify(analysis, null, 2)}

Now write 3 completely different repurposed commercial scripts for this brand, applying the same viral factor
to a new product:
${brandBrief(brand)}

${toneNote(analysis)}

Reuse the viral factor and structure you identified above — the hook shape, the pain-to-relief arc — but rewrite
it entirely for this brand — never mention the original brand or reuse its exact wording. Pick your own CTA for
each script; don't ask the user for one. Produce exactly three scripts with style "emotional", "humorous", and
"high_conversion". Each needs: a title, a one-line hook, a full timestamped scene-by-scene script (dialogue +
visual direction), scene descriptions, emotional direction, a CTA, an estimated duration in seconds, and the
ISO 639-1 language code the script is written in.`;
}

export function scriptIdeasPrompt(analysis: VideoAnalysis, brand: BrandProfile) {
  return `You analyzed a video with this viral breakdown:
${JSON.stringify(analysis, null, 2)}

Pitch 3 completely different repurposed commercial concepts for this brand, each applying the same viral factor
to a new product — this is a quick concept pitch, not the full script yet:
${brandBrief(brand)}

${toneNote(analysis)}

Produce exactly three concepts with style "emotional", "humorous", and "high_conversion". Each needs: a title, a
one-line hook, and a 2-3 sentence pitch describing the angle and how it repurposes the original's viral factor —
no scene-by-scene detail yet.`;
}

export function masterScriptPrompt(
  analysis: VideoAnalysis,
  brand: BrandProfile,
  idea: ScriptIdea,
  durationSeconds: number,
) {
  return `You analyzed a video with this viral breakdown:
${JSON.stringify(analysis, null, 2)}

The user picked this concept to develop into a full commercial script:
- Style: ${idea.style}
- Title: ${idea.title}
- Hook: ${idea.hook}
- Pitch: ${idea.pitch}

Write the full script for this brand:
${brandBrief(brand)}

${toneNote(analysis)}

Reuse the viral factor and structure from the analysis — the hook shape, the pain-to-relief arc — but rewrite it
entirely for this brand — never mention the original brand or reuse its exact wording. Pick your own CTA; don't
ask the user for one. Return one script with: the title and hook above (refine them if it makes the script
stronger), a full timestamped scene-by-scene script (dialogue + visual direction), scene descriptions, emotional
direction, and a CTA.

This script will be rendered as exactly a ${durationSeconds}-second video — pace the scene timestamps so they
literally span 0:00 to ${durationSeconds}s, the last scene must end at ${durationSeconds}s exactly, not before
or after. Fit the hook-to-CTA arc naturally into that runtime rather than padding or rushing it. Set
estimated_duration to "${durationSeconds}s" and return the ISO 639-1 language code the script is written in.`;
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
  /** The analyzed source video's own visual style — used when cameraStyle is "original". */
  sourceVisualStyle?: string | null;
}) {
  const {
    scriptBody,
    brand,
    durationSeconds,
    aspectRatio,
    quality,
    cameraStyle,
    sourceVisualStyle,
  } = params;
  const styleDescription =
    cameraStyle === "original"
      ? (sourceVisualStyle ?? "the same camera style as the original uploaded reference video")
      : `${cameraStyle} style`;
  return `Cinematic ${aspectRatio} commercial for ${brand.brand_name ?? "the brand"}, ${durationSeconds}s,
${quality} quality, shot in ${styleDescription}. Brand colors: ${brand.brand_colors?.join(", ") ?? "brand default"}.
Based on this script:
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
