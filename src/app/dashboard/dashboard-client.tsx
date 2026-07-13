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
import type { Script } from "@/lib/types";

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
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  return (
    <AppShell title="New Commercial">
      <div className="mx-auto max-w-6xl space-y-6">
        <StepProgress current={phaseStep[phase]} />

        {phase === "upload" && (
          <UploadStep
            onContinue={(id) => {
              setProjectId(id);
              setPhase("analysis");
            }}
          />
        )}
        {phase === "analysis" && projectId && (
          <AnalysisStep projectId={projectId} onContinue={() => setPhase("script")} />
        )}
        {phase === "script" && projectId && (
          <ScriptStep
            projectId={projectId}
            onSelect={(script) => {
              setSelectedScript(script);
              setPhase("settings");
            }}
          />
        )}
        {phase === "settings" && projectId && selectedScript && (
          <GenerateStep
            projectId={projectId}
            scriptId={selectedScript.id}
            onGenerate={(id) => {
              setGenerationId(id);
              setPhase("generating");
            }}
          />
        )}
        {phase === "generating" && generationId && (
          <GenerationScreen
            generationId={generationId}
            onComplete={() => setPhase("result")}
            onRetry={() => setPhase("settings")}
          />
        )}
        {phase === "result" && generationId && (
          <ResultStep
            generationId={generationId}
            script={selectedScript}
            onRegenerate={(newGenerationId) => {
              setGenerationId(newGenerationId);
              setPhase("generating");
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
