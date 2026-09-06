import type {
  AspectRatio,
  BrandProfile,
  Quality,
  ScriptIdea,
  ScriptLanguage,
  VideoAnalysis,
} from "@/lib/types";
import { SCRIPT_LANGUAGE_LABELS } from "@/lib/types";

export const ANALYSIS_SYSTEM_PROMPT = `You are a viral video analyst. Watch the uploaded video and figure out
exactly why it went viral — the hook, the pacing, the emotional arc, the pain it names and the relief it offers.
Be specific and concrete — quote the actual hook line, name the actual visual choices — never generic marketing
platitudes. "viral_factor" should be your single best explanation of the core reason this video spread.`;

/** Shared brand-context block — used by every script-writing prompt below. */
function brandBrief(brand: BrandProfile) {
  // Only true when gemini.ts actually attached the logo image to this request (brand.logo_path
  // set and the fetch succeeded) — keep this claim in sync with scriptContents() there.
  const logo = brand.logo_path
    ? `\n- Brand logo: the image attached to this request. Look at it and use its real colors,` +
      ` shape, and wordmark/symbol whenever the script calls for on-screen brand text or a logo` +
      ` shot — describe what's actually in the image, don't invent generic branding.`
    : "";
  // Same sync requirement as the logo line above, against brandContextImageParts() in gemini.ts.
  const contextImages = brand.context_image_paths?.length
    ? `\n- Brand context images: ${brand.context_image_paths.length} image(s) attached to this` +
      ` request — look at them for real product appearance, packaging, setting, and mood; ground` +
      ` descriptions in what's actually shown instead of inventing generic imagery.`
    : "";
  return `- Brand: ${brand.brand_name ?? "Unnamed brand"}
- Product/Service: ${brand.product_service ?? "n/a"}
- Target audience: ${brand.target_audience ?? "n/a"}
- Brand description: ${brand.description ?? "n/a"}${logo}${contextImages}`;
}

/** Tone is never asked of the user — it's carried over from what the analyzed video actually did. */
function toneNote(analysis: VideoAnalysis) {
  return `Match the tone of the original: ${analysis.tone_of_voice ?? "infer it from the analysis below"}. If the
original was funny, be funny; if it was earnest, stay earnest — don't default to a generic "commercial" tone.`;
}

// Shared tail for whichever language block below — the structural/director's-notes exception
// applies the same way regardless of language.
const LANGUAGE_INSTRUCTION_TAIL = `The only exceptions are the structural section labels and physical/camera
directions described below (CONTINUITY LOCK, character/location descriptions, CAMERA/ACTION/AUDIO lines,
section headers like SCENE/FINAL FRAME/VIDEO STYLE) — those stay in English exactly as instructed, since
they're director's notes for the video generator, not spoken or on-screen content a viewer reads.`;

/**
 * Hinglish needs its own instruction rather than the generic "${label} (${code})" template below —
 * a vague instruction just produces plain English or plain Hindi, not genuine code-mixing (this is
 * also why it isn't in SCRIPT_LANGUAGE_LABELS' code passed to a generic "write in X" line).
 */
function languageInstruction(language: ScriptLanguage) {
  if (language === "hinglish") {
    return `Write this ENTIRE script in Hinglish — casual, code-mixed Hindi-English the way it's actually spoken/
texted in urban India, NOT pure English and NOT pure Hindi. "title", "hook", "cta", "scene_descriptions",
"emotional_direction", and every DIALOGUE/SUBTITLE line inside "body" must ALL genuinely mix Hindi and English
words within the same sentences (e.g. "Yaar, yeh product seriously kamaal hai" — not a Hindi sentence followed
by a separate English one). Rules:
- Latin/Roman script only (the English alphabet) — never Devanagari. Hindi words are transliterated, not
  written in the Hindi script.
- Keep the tone casual and conversational, like a friend talking, not a formal translation.
- Don't just translate the English concept above word-for-word into Hindi and call it done — actually
  code-switch mid-sentence the way real Hinglish speakers do.

${LANGUAGE_INSTRUCTION_TAIL}`;
  }

  return `Write this ENTIRE script in ${SCRIPT_LANGUAGE_LABELS[language]} (${language}) — "title", "hook", "cta",
"scene_descriptions", "emotional_direction", and every DIALOGUE/SUBTITLE line inside "body" must ALL be in
${SCRIPT_LANGUAGE_LABELS[language]}, never left in English (translate the concept above, don't just echo its
English title/hook back).

${LANGUAGE_INSTRUCTION_TAIL}`;
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

export function scriptIdeasPrompt(analysis: VideoAnalysis, brand: BrandProfile, repurposeOnly = false) {
  if (repurposeOnly) {
    return `You analyzed a video with this viral breakdown:
${JSON.stringify(analysis, null, 2)}

Pitch 2 completely different REPURPOSED commercial concepts for this brand, each creatively adapting the
core concept, emotion, or narrative arc of the original ad into a completely new scenario that fits the
target brand's unique product and audience — this is a quick concept pitch, not the full script yet:
${brandBrief(brand)}

${toneNote(analysis)}

Produce exactly TWO repurposed concepts with styles "emotional" and "high_conversion". Each needs: a
title, a one-line hook, and a 2-3 sentence pitch describing the angle and how it creatively repurposes
the original's viral factor for the target brand — no scene-by-scene detail yet. Never mention the
original brand or reuse its exact wording.`;
  }

  return `You analyzed a video with this viral breakdown:
${JSON.stringify(analysis, null, 2)}

Generate exactly 3 commercial concepts for this brand:
${brandBrief(brand)}

${toneNote(analysis)}

CONCEPT 1 — REPURPOSED (style: "emotional"):
A creatively repurposed concept that takes the core emotion or narrative arc of the original ad and
adapts it into a completely new scenario that fits the target brand's unique product and audience.
Hook into the same emotional trigger but reframe everything else for the new brand. Never mention the
original brand.

CONCEPT 2 — REPURPOSED (style: "high_conversion"):
A creatively repurposed concept focused on the original's pain-to-relief conversion arc, adapted
for the target brand. Maximize the virality factor identified above. Never mention the original brand.

CONCEPT 3 — RECLONE (style: "reclone"):
A shot-for-shot structural RECLONE of the original ad's visual sequence, pacing, and camera angles —
but with the original brand's products, props, and branding swapped out for the target brand's.
Describe the reconstruction faithfully: same pacing, same emotional beats, same scene structure —
just mapped to the new brand. Label clearly in the title as "Reclone:" prefix (e.g. "Reclone: [original concept name] for [brand]").

Each concept needs: a title, a one-line hook, and a 2-3 sentence pitch — no scene-by-scene detail yet.`;
}

export function masterScriptPrompt(
  analysis: VideoAnalysis,
  brand: BrandProfile,
  idea: ScriptIdea,
  durationSeconds: number,
  options?: { language?: ScriptLanguage; subtitles?: boolean },
) {
  const language = options?.language ?? "en";
  const subtitles = options?.subtitles ?? false;
  const midpoint = Math.round(durationSeconds / 2);
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

${languageInstruction(language)}

Reuse the viral factor and structure from the analysis — the hook shape, the pain-to-relief arc — but rewrite it
entirely for this brand — never mention the original brand or reuse its exact wording. Pick your own CTA; don't ask the user for one.

"body" is fed directly into an AI video generator as its shot-by-shot prompt AND shown verbatim in a plain-text
editor, so write it in this EXACT structure — precision here is what determines shot quality, continuity, and
lip-sync accuracy. Use REAL newline characters between every line and section below, never run them together
separated only by spaces — each labeled line (LOCATION:, CAMERA:, ACTION:, AUDIO:, DIALOGUE:, etc.) starts on
its own new line, and each "---" scene separator sits on its own line too:

Start with a header line: your translated "title" and "hook" (see above), both in ALL CAPS, separated by " – ".
On the next line: TOTAL DURATION: ${durationSeconds} SECONDS

CONTINUITY LOCK (APPLIES TO ENTIRE VIDEO)
Name every character in caps (e.g. "MOTHER:", "DELIVERY AGENT:") with age, build, skin tone, hair, and exact wardrobe (colors, fabric details) plus any signature prop that must never disappear, swap, or change mid-video.
Then LOCATION: every static object in frame. Then FIRST HALF COLOR / SECOND HALF COLOR: the lighting mood
before and after the brand's "relief" moment — cold/desaturated before, warm/vibrant after.

Then one "---"-separated SCENE block per beat, timestamped (e.g. "SCENE 1 (0-3s)"), each containing:
CAMERA: shot type and movement
ACTION: physically plausible blocking — objects obey gravity and momentum, no prop teleportation
AUDIO: sound effects only, no music
DIALOGUE: the line(s), attributed to exactly one character${
    subtitles ? "\nSUBTITLE: the exact same line verbatim, for on-screen burnt-in captions" : ""
  }
LIP-SYNC RULE: name the one character whose mouth moves; every other character stays silent in that shot

Roughly at the ${midpoint}s mark, insert a MANDATORY CONTINUITY FRAME: a freeze-frame description of exact
character poses, props, and lighting at that instant, followed by an END FRAME LOCK list (preserve character
appearance / environment / lighting, no resets) that the next scene must continue from exactly.

Close with a FINAL FRAME section: state of every character and prop at ${durationSeconds}.0s, centered
on-screen brand text/logo using the brand's real colors (${brand.brand_colors?.join(", ") ?? "brand default"})${
    brand.logo_path ? " and matching the attached logo image exactly, not a generic wordmark" : ""
  }, and a final AUDIO cue.

End with a VIDEO STYLE block: photorealistic live-action, natural facial animation, realistic object physics,
accurate lip-sync, consistent character identity, no character swapping, no wardrobe changes, no prop
teleportation, no environment resets${subtitles ? ", burnt-in subtitles matching every spoken line" : ""}.

This script will be rendered as exactly a ${durationSeconds}-second video — pace the scene timestamps so they
literally span 0:00 to ${durationSeconds}s, the last scene ending at ${durationSeconds}s exactly. Fit the
hook-to-CTA arc naturally into that runtime rather than padding or rushing it.

Return "scene_descriptions" as a short plain-language beat summary (for the UI list view, separate from "body"),
"emotional_direction" as the emotional arc in one sentence, "cta" as the one-line call to action, set
estimated_duration to "${durationSeconds}s", and set "language" to "${language}".`;
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
