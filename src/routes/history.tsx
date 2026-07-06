import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ProjectGrid } from "@/components/app/ProjectGrid";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Repurpose AI" },
      { name: "description", content: "Browse and manage every AI commercial you've generated." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <AppShell title="Project History">
      <div className="mx-auto max-w-6xl">
        <ProjectGrid />
      </div>
    </AppShell>
  );
}
