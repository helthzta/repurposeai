import { createPartFromUri, createUserContent, GoogleGenAI, Type } from "@google/genai";
import type { AiInsights, BrandProfile, ScriptIdea, ScriptStyle, VideoAnalysis } from "@/lib/types";
import {
  ANALYSIS_SYSTEM_PROMPT,
  masterScriptPrompt,
  scriptAssistPrompt,
  scriptGenerationPrompt,
  scriptIdeasPrompt,
  scorePrompt,
} from "./prompts";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let client: GoogleGenAI | null = null;
function ai() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ANALYSIS_FIELDS = [
  "company",
  "company_does",
  "duration_seconds",
  "viral_factor",
  "hook",
  "pain_point",
  "context",
  "emotional_trigger",
  "audience",
  "relief",
  "hero",
  "language",
  "video_metrics",
  "tone_of_voice",
  "visual_style",
] as const;

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: Object.fromEntries(
    ANALYSIS_FIELDS.map((field) => [
      field,
      { type: field === "duration_seconds" ? Type.NUMBER : Type.STRING },
    ]),
  ),
  required: [...ANALYSIS_FIELDS],
};

export type AnalysisResult = Record<(typeof ANALYSIS_FIELDS)[number], string | number>;

/** Uploads the video to Gemini's Files API and extracts the doc's 15 structured fields. */
export async function analyzeVideo(bytes: Buffer, mimeType: string): Promise<AnalysisResult> {
  const client = ai();
  let file = await client.files.upload({
    file: new Blob([new Uint8Array(bytes)], { type: mimeType }),
    config: { mimeType },
  });

  for (let attempt = 0; file.state === "PROCESSING" && attempt < 30; attempt++) {
    await sleep(2000);
    file = await client.files.get({ name: file.name! });
  }
  if (file.state !== "ACTIVE")
    throw new Error(`Gemini file processing did not complete (state: ${file.state})`);

  const response = await client.models.generateContent({
    model: MODEL,
    contents: createUserContent([
      createPartFromUri(file.uri!, file.mimeType!),
      ANALYSIS_SYSTEM_PROMPT,
    ]),
    config: { responseMimeType: "application/json", responseSchema: ANALYSIS_SCHEMA },
  });

  if (!response.text) throw new Error("Gemini returned an empty analysis");
  return JSON.parse(response.text);
}

const SCRIPT_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    style: { type: Type.STRING, enum: ["emotional", "humorous", "high_conversion"] },
    title: { type: Type.STRING },
    hook: { type: Type.STRING },
    body: { type: Type.STRING },
    scene_descriptions: { type: Type.STRING },
    emotional_direction: { type: Type.STRING },
    cta: { type: Type.STRING },
    estimated_duration: { type: Type.STRING },
    language: { type: Type.STRING },
  },
  required: [
    "style",
    "title",
    "hook",
    "body",
    "scene_descriptions",
    "emotional_direction",
    "cta",
    "estimated_duration",
    "language",
  ],
};

export interface GeneratedScript {
  style: ScriptStyle;
  title: string;
  hook: string;
  body: string;
  scene_descriptions: string;
  emotional_direction: string;
  cta: string;
  estimated_duration: string;
  language: string;
}

export async function generateScripts(
  analysis: VideoAnalysis,
  brand: BrandProfile,
): Promise<GeneratedScript[]> {
  const client = ai();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: scriptGenerationPrompt(analysis, brand),
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: SCRIPT_ITEM_SCHEMA, minItems: 3, maxItems: 3 },
    },
  });

  if (!response.text) throw new Error("Gemini returned no scripts");
  return JSON.parse(response.text);
}

const SCRIPT_IDEA_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    style: { type: Type.STRING, enum: ["emotional", "humorous", "high_conversion"] },
    title: { type: Type.STRING },
    hook: { type: Type.STRING },
    pitch: { type: Type.STRING },
  },
  required: ["style", "title", "hook", "pitch"],
};

/** 3 short, un-persisted concepts shown before committing to writing a full script. */
export async function generateScriptIdeas(
  analysis: VideoAnalysis,
  brand: BrandProfile,
): Promise<ScriptIdea[]> {
  const client = ai();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: scriptIdeasPrompt(analysis, brand),
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: SCRIPT_IDEA_SCHEMA, minItems: 3, maxItems: 3 },
    },
  });

  if (!response.text) throw new Error("Gemini returned no ideas");
  return JSON.parse(response.text);
}

/** The one full script written once a user commits to a specific idea. */
export async function generateMasterScript(
  analysis: VideoAnalysis,
  brand: BrandProfile,
  idea: ScriptIdea,
): Promise<GeneratedScript> {
  const client = ai();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: masterScriptPrompt(analysis, brand, idea),
    config: { responseMimeType: "application/json", responseSchema: SCRIPT_ITEM_SCHEMA },
  });

  if (!response.text) throw new Error("Gemini returned no script");
  return JSON.parse(response.text);
}

export async function editScript(currentBody: string, instruction: string): Promise<string> {
  const client = ai();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: scriptAssistPrompt(currentBody, instruction),
  });

  if (!response.text) throw new Error("Gemini returned no revised script");
  return response.text.trim();
}

const INSIGHTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    marketing_score: { type: Type.NUMBER },
    creativity_score: { type: Type.NUMBER },
    brand_match_score: { type: Type.NUMBER },
    emotional_impact: { type: Type.NUMBER },
    predicted_conversion: { type: Type.NUMBER },
  },
  required: [
    "marketing_score",
    "creativity_score",
    "brand_match_score",
    "emotional_impact",
    "predicted_conversion",
  ],
};

export async function scoreGeneration(
  scriptBody: string,
  brand: BrandProfile,
): Promise<AiInsights> {
  const client = ai();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: scorePrompt(scriptBody, brand),
    config: { responseMimeType: "application/json", responseSchema: INSIGHTS_SCHEMA },
  });

  if (!response.text) throw new Error("Gemini returned no insights");
  return JSON.parse(response.text);
}
