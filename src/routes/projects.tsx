import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProjectGrid } from "@/components/app/ProjectGrid";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Repurpose AI" },
      { name: "description", content: "All your AI commercial projects in one place." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <AppShell title="Projects">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-end">
          <Button asChild className="btn-glow rounded-xl font-semibold">
            <Link to="/dashboard">
              <Plus className="h-4 w-4" />
              New Commercial
            </Link>
          </Button>
        </div>
        <ProjectGrid />
      </div>
    </AppShell>
  );
}
