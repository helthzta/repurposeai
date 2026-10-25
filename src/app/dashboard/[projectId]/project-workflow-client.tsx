"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { StepProgress } from "@/components/workflow/StepProgress";
import { AnalysisStep } from "@/components/workflow/AnalysisStep";
import { IdeaStep } from "@/components/workflow/IdeaStep";
import { GenerateStep } from "@/components/workflow/GenerateStep";
import { GenerationScreen } from "@/components/workflow/GenerationScreen";
import { ResultStep } from "@/components/workflow/ResultStep";
import type { Script, ScriptIdea } from "@/lib/types";
import type { WorkflowPhase } from "@/lib/projects";

const phaseStep: Record<WorkflowPhase, number> = {
  analysis: 1,
  ideas: 2,
  settings: 3,
  generating: 3,
  result: 4,
};

export function ProjectWorkflowClient({
  projectId,
  initialPhase,
  initialScripts,
  initialScript,
  initialGenerationId,
  initialIdeas,
  initialError,
  originalTone,
}: {
  projectId: string;
  initialPhase: WorkflowPhase;
  /** The 15s/30s script variants for the Settings step, once an idea's been picked. */
  initialScripts: Script[];
  initialScript: Script | null;
  initialGenerationId: string | null;
  initialIdeas: ScriptIdea[] | null;
  initialError: string | null;
  /** The analyzed source video's tone, surfaced on the Idea step — null if not detected. */
  originalTone: string | null;
}) {
  const [phase, setPhase] = useState<WorkflowPhase>(initialPhase);
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [selectedScript, setSelectedScript] = useState<Script | null>(initialScript);
  const [generationId, setGenerationId] = useState<string | null>(initialGenerationId);
  const [ideas, setIdeas] = useState<ScriptIdea[] | null>(initialIdeas);

  // Only set on load when resuming here because a past attempt failed — surfaces the
  // reason once instead of silently dropping the user back at settings unexplained.
  useEffect(() => {
    if (initialError) {
      toast.error("Your last generation attempt failed", { description: initialError });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title="Commercial">
      <div className="mx-auto max-w-6xl space-y-6">
        <StepProgress current={phaseStep[phase]} />

        {phase === "analysis" && (
          <AnalysisStep projectId={projectId} onContinue={() => setPhase("ideas")} />
        )}
        {phase === "ideas" && (
          <IdeaStep
            projectId={projectId}
            initialIdeas={ideas}
            originalTone={originalTone}
            onIdeasReady={setIdeas}
            onScriptsReady={(scripts) => {
              setScripts(scripts);
              setPhase("settings");
            }}
          />
        )}
        {phase === "settings" && scripts.length > 0 && (
          <GenerateStep
            projectId={projectId}
            scripts={scripts}
            onBack={() => setPhase("ideas")}
            onGenerate={(id, script) => {
              setSelectedScript(script);
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
