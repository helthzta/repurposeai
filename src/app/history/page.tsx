import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { ProjectGrid } from "@/components/app/ProjectGrid";

export const metadata: Metadata = {
  title: "History — Repurpose AI",
  description: "Browse and manage every AI commercial you've generated.",
};

export default function HistoryPage() {
  return (
    <AppShell title="Project History">
      <div className="mx-auto max-w-6xl">
        <ProjectGrid />
      </div>
    </AppShell>
  );
}
