import type { Metadata } from "next";
import { getProjects } from "@/lib/actions/projects";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard | Fack API",
  description:
    "Manage your mock API projects, endpoints, routes, and request logs.",
};

/**
 * Dashboard Page.
 * Fetches the project list on the server and mounts ProjectGrid.
 */
export default async function DashboardPage() {
  const projects = await getProjects();
  return <ProjectGrid initialProjects={projects} />;
}
