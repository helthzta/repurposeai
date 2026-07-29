import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectDetail } from "@/lib/projects";
import { ProjectVideosClient } from "./project-videos-client";

export const metadata: Metadata = {
  title: "Project — Repurpose AI",
  description: "All the commercials generated for this project.",
};

export default async function ProjectVideosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let supabase, user;
  try {
    ({ supabase, user } = await requireUser());
  } catch {
    redirect("/login");
  }

  const project = await getProjectDetail(supabase, user.id, id);
  if (!project) notFound();

  return <ProjectVideosClient project={project} />;
}
