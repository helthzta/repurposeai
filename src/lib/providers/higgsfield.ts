import { NotImplementedError, type VideoProvider } from "./types";

// Registered so the provider architecture is extensible (per the doc), but not
// wired to a real API yet — the doc scopes v1 to "initially support one provider".
// The UI keeps this option disabled until real credentials + adapter code land.
class HiggsfieldProvider implements VideoProvider {
  maxClipDurationSeconds = Infinity;

  async submit(): Promise<never> {
    throw new NotImplementedError("Higgsfield is not enabled yet");
  }

  async poll(): Promise<never> {
    throw new NotImplementedError("Higgsfield is not enabled yet");
  }
}

export const higgsfieldProvider = new HiggsfieldProvider();
