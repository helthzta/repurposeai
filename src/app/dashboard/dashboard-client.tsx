"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { StepProgress } from "@/components/workflow/StepProgress";
import { UploadStep } from "@/components/workflow/UploadStep";
import { AnalysisStep } from "@/components/workflow/AnalysisStep";
import { ScriptStep } from "@/components/workflow/ScriptStep";
import { GenerateStep } from "@/components/workflow/GenerateStep";
import { GenerationScreen } from "@/components/workflow/GenerationScreen";
import { ResultStep } from "@/components/workflow/ResultStep";
import type { ScriptVersion } from "@/lib/mock-data";

type Phase = "upload" | "analysis" | "script" | "settings" | "generating" | "result";

const phaseStep: Record<Phase, number> = {
  upload: 0,
  analysis: 1,
  script: 2,
  settings: 3,
  generating: 3,
  result: 4,
};

export function DashboardClient() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [selectedScript, setSelectedScript] = useState<ScriptVersion | null>(null);

  return (
    <AppShell title="New Commercial · Lumière Signature Drop">
      <div className="mx-auto max-w-6xl space-y-6">
        <StepProgress current={phaseStep[phase]} />

        {phase === "upload" && <UploadStep onContinue={() => setPhase("analysis")} />}
        {phase === "analysis" && <AnalysisStep onContinue={() => setPhase("script")} />}
        {phase === "script" && (
          <ScriptStep
            onSelect={(script) => {
              setSelectedScript(script);
              setPhase("settings");
            }}
          />
        )}
        {phase === "settings" && <GenerateStep onGenerate={() => setPhase("generating")} />}
        {phase === "generating" && <GenerationScreen onComplete={() => setPhase("result")} />}
        {phase === "result" && (
          <ResultStep script={selectedScript} onRegenerate={() => setPhase("generating")} />
        )}
      </div>
    </AppShell>
  );
}
