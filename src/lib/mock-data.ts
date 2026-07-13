export interface AnalysisCard {
  label: string;
  value: string;
}

export const analysisCards: AnalysisCard[] = [
  { label: "Company", value: "Lumière Fragrance Co." },
  { label: "Business", value: "Premium D2C perfume brand" },
  { label: "Duration", value: "27 seconds" },
  { label: "Hook", value: '"What does confidence smell like?" — direct question over macro shot' },
  { label: "Audience", value: "Women 24–38, urban, aspirational lifestyle" },
  { label: "Pain", value: "Generic fragrances that fade within hours" },
  { label: "Context", value: "Evening city scenes, golden hour, close-up product moments" },
  { label: "Emotion", value: "Desire, self-assurance, quiet luxury" },
  { label: "Hero", value: "The bottle itself — treated as a jewelry object" },
  { label: "CTA", value: '"Find your signature scent" with limited-drop urgency' },
  {
    label: "Marketing Strategy",
    value: "Aspirational identity play — sell the feeling, not the formula",
  },
  {
    label: "Narrative Structure",
    value: "Question hook → transformation montage → product reveal → CTA",
  },
  { label: "Offer", value: "20% off first bottle + free sample set" },
  { label: "Visual Style", value: "Cinematic, shallow depth of field, warm-cool contrast" },
  { label: "Tone", value: "Confident, minimal voiceover, whispered intimacy" },
];

export interface ScriptVersion {
  id: string;
  title: string;
  badge: string;
  hook: string;
  duration: string;
  script: string;
  cta: string;
  emotion: string;
}

export const scriptVersions: ScriptVersion[] = [
  {
    id: "emotional",
    title: "Emotional Version",
    badge: "Emotional",
    hook: '"Some moments deserve to be remembered by scent."',
    duration: "~28 sec",
    script: `[0:00] Slow push-in on a woman pausing at a window, city lights blurred behind her.
[0:04] VO: "Some moments deserve to be remembered by scent."
[0:08] Montage — a first date, a promotion, a quiet Sunday morning.
[0:15] Macro shot: fragrance mist catching the light in slow motion.
[0:20] VO: "Yours isn't a perfume. It's a memory waiting to happen."
[0:24] Product reveal on marble, soft golden glow.
[0:26] Text: "Find the scent that remembers you."`,
    cta: "Find the scent that remembers you",
    emotion: "Nostalgia · Warmth",
  },
  {
    id: "humorous",
    title: "Humorous Version",
    badge: "Humorous",
    hook: '"Warning: may cause strangers to follow you into elevators."',
    duration: "~24 sec",
    script: `[0:00] Deadpan narrator over a woman entering an elevator.
[0:03] VO: "Warning: may cause strangers to follow you into elevators."
[0:07] Three people sniff the air dramatically, one misses their floor.
[0:12] Quick cuts: dog does a double take, barista writes phone number on cup.
[0:18] Product shot with legal-style fine print scrolling comically fast.
[0:21] VO: "Lumière. Legally, we can't call it a superpower."
[0:23] Text: "Smell responsibly."`,
    cta: "Smell responsibly — shop now",
    emotion: "Playful · Witty",
  },
  {
    id: "conversion",
    title: "High Conversion Version",
    badge: "High Conversion",
    hook: '"9,000+ five-star reviews. One scent. Here\'s why."',
    duration: "~30 sec",
    script: `[0:00] Bold text over product: "9,000+ five-star reviews. One scent."
[0:04] VO: "Here's why Lumière sells out every single drop."
[0:08] Rapid proof points: 12-hour wear, clean ingredients, refill system.
[0:15] UGC-style clips of real customers reacting to first spray.
[0:21] Price anchor: "Department store quality. Half the price."
[0:25] Offer card slides in: 20% off + free sample set, today only.
[0:28] Text: "Claim your first bottle — 20% off ends tonight."`,
    cta: "Claim 20% off — ends tonight",
    emotion: "Urgency · Trust",
  },
];

export interface HistoryProject {
  id: string;
  name: string;
  date: string;
  duration: string;
  provider: string;
  thumb: "perfume" | "sneaker" | "skincare";
  aspect: "portrait" | "landscape";
}

export const historyProjects: HistoryProject[] = [
  {
    id: "p1",
    name: "Lumière Signature Drop",
    date: "Jul 4, 2026",
    duration: "0:28",
    provider: "Seedance",
    thumb: "perfume",
    aspect: "portrait",
  },
  {
    id: "p2",
    name: "Velocity Runner Launch",
    date: "Jul 2, 2026",
    duration: "0:15",
    provider: "Higgsfield",
    thumb: "sneaker",
    aspect: "landscape",
  },
  {
    id: "p3",
    name: "GlowLab Hydration Serum",
    date: "Jun 28, 2026",
    duration: "0:30",
    provider: "Seedance",
    thumb: "skincare",
    aspect: "landscape",
  },
  {
    id: "p4",
    name: "Lumière Holiday Teaser",
    date: "Jun 21, 2026",
    duration: "0:15",
    provider: "Seedance",
    thumb: "perfume",
    aspect: "portrait",
  },
  {
    id: "p5",
    name: "Velocity Trail Edition",
    date: "Jun 14, 2026",
    duration: "0:30",
    provider: "Higgsfield",
    thumb: "sneaker",
    aspect: "landscape",
  },
  {
    id: "p6",
    name: "GlowLab Night Ritual",
    date: "Jun 8, 2026",
    duration: "0:28",
    provider: "Seedance",
    thumb: "skincare",
    aspect: "landscape",
  },
];

export const generationStages = [
  "Analyzing...",
  "Understanding Marketing...",
  "Repurposing...",
  "Optimizing Prompt...",
  "Generating Video...",
  "Rendering...",
];

export const aiInsights = [
  { label: "Marketing Score", value: 94 },
  { label: "Creativity Score", value: 88 },
  { label: "Brand Match Score", value: 96 },
  { label: "Emotional Impact", value: 91 },
  { label: "Predicted Conversion", value: 87 },
];
