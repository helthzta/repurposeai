"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Script } from "@/lib/types";
import { ScriptEditor } from "./ScriptEditor";

export function ScriptStep({
  script: initialScript,
  onBack,
  onContinue,
}: {
  script: Script;
  onBack: () => void;
  onContinue: (script: Script) => void;
}) {
  const [script, setScript] = useState(initialScript);

  return (
    <div className="animate-fade-up space-y-6">
      <ScriptEditor script={script} onBack={onBack} onSync={setScript} onSave={setScript} />
      <div className="flex justify-end">
        <Button
          size="lg"
          className="btn-glow h-12 rounded-xl px-8 font-semibold"
          onClick={() => onContinue(script)}
        >
          Continue to Settings
          <ArrowRight className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}
