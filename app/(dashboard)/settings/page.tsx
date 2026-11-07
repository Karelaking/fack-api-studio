import React from "react";
import type { Metadata } from "next";

import { readWorkspaceConfig } from "@/lib/storage/config-store";
import { getStorageStatus } from "@/lib/storage/status";
import { getProjects } from "@/lib/actions/projects";
import { getScenarios } from "@/lib/actions/scenarios";
import type { Scenario } from "@/db/schema";
import { PageShell } from "@/components/dashboard/PageShell";
import { UnifiedSettingsView } from "@/components/settings/UnifiedSettingsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings | Fack API",
  description:
    "Unified workspace, project, chaos profiles, and storage settings.",
};

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const [status, config, projects] = await Promise.all([
    getStorageStatus(),
    Promise.resolve(readWorkspaceConfig()),
    getProjects(),
  ]);

  const scenariosByProject: Record<string, Scenario[]> = {};
  await Promise.all(
    projects.map(async (project) => {
      try {
        scenariosByProject[project.id] = await getScenarios(project.id);
      } catch {
        scenariosByProject[project.id] = [];
      }
    }),
  );

  const isLogsDbConfigured = Boolean(process.env.LOGS_POSTGRES_URL);

  return (
    <PageShell className="max-w-6xl">
      <UnifiedSettingsView
        initialStatus={status}
        initialConfig={config}
        projects={projects}
        scenariosByProject={scenariosByProject}
        isLogsDbConfigured={isLogsDbConfigured}
      />
    </PageShell>
  );
}
