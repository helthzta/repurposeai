import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard — Repurpose AI",
  description:
    "Upload an ad, analyze the strategy, choose a script, and generate your AI commercial.",
};

export default function Dashboard() {
  return <DashboardClient />;
}
