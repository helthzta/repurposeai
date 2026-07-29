import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProjectGrid } from "@/components/app/ProjectGrid";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Projects — Repurpose AI",
  description: "All your AI commercial projects in one place.",
};

export default function ProjectsPage() {
  return (
    <AppShell title="Projects">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-end">
          <Button asChild className="btn-glow rounded-xl font-semibold">
            <Link href="/dashboard">
              <Plus className="h-4 w-4" />
              New Commercial
            </Link>
          </Button>
        </div>
        <ProjectGrid mode="projects" />
      </div>
    </AppShell>
  );
}
