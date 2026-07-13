import type { VideoProviderName } from "@/lib/types";
import { higgsfieldProvider } from "./higgsfield";
import { seedanceProvider } from "./seedance";
import type { VideoProvider } from "./types";

const REGISTRY: Record<VideoProviderName, VideoProvider> = {
  seedance: seedanceProvider,
  higgsfield: higgsfieldProvider,
};

export function getProvider(name: VideoProviderName): VideoProvider {
  return REGISTRY[name];
}

export * from "./types";
