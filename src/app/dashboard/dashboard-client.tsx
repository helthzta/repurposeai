"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { StepProgress } from "@/components/workflow/StepProgress";
import { UploadStep } from "@/components/workflow/UploadStep";
import { useProfile } from "@/hooks/use-profile";

export function DashboardClient() {
  const router = useRouter();
  const { data } = useProfile();
  // New accounts start with 0 credits — say so before they analyse a video, not at the last step.
  const noCredits = data?.profile && data.profile.credits_balance === 0;

  return (
    <AppShell title="New Commercial">
      <div className="mx-auto max-w-6xl space-y-6">
        {noCredits && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-primary/25 bg-accent/60 px-5 py-4">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">You have 0 credits.</span>{" "}
              <span className="text-muted-foreground">
                You can analyse a video and explore ideas now — choose a plan to generate the
                commercial.
              </span>
            </p>
            <Button asChild size="sm" className="btn-glow rounded-xl font-semibold">
              <Link href="/credits">View plans</Link>
            </Button>
          </div>
        )}
        <StepProgress current={0} />
        <UploadStep onContinue={(projectId) => router.push(`/dashboard/${projectId}`)} />
      </div>
    </AppShell>
  );
}
