"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { StepProgress } from "@/components/workflow/StepProgress";
import { UploadStep } from "@/components/workflow/UploadStep";

export function DashboardClient() {
  const router = useRouter();

  return (
    <AppShell title="New Commercial">
      <div className="mx-auto max-w-6xl space-y-6">
        <StepProgress current={0} />
        <UploadStep onContinue={(projectId) => router.push(`/dashboard/${projectId}`)} />
      </div>
    </AppShell>
  );
}
