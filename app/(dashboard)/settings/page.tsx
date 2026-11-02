import React from "react";
import { RiDeleteBin6Line } from "@remixicon/react";

import { readWorkspaceConfig } from "@/lib/storage/config-store";
import { getStorageStatus } from "@/lib/storage/status";
import { StorageSection } from "@/components/settings/StorageSection";
import { WorkspaceNameForm } from "@/components/settings/WorkspaceNameForm";
import { PageHeading, PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Settings | Fack API",
  description: "Manage your workspace settings.",
};

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const status = await getStorageStatus();
  const config = readWorkspaceConfig();

  return (
    <PageShell className="max-w-4xl">
      <PageHeading
        title="Workspace Settings"
        description="Manage where your data lives and how your workspace is identified."
      />

      <StorageSection initialStatus={status} />

      <div className="bg-card/30 border-border/50 rounded-xl border shadow-sm">
        <div className="border-border/50 border-b p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Workspace Name
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            This is your workspace&apos;s visible name within Fack API.
          </p>
          <WorkspaceNameForm
            initialName={config.workspaceName ?? "My Workspace"}
          />
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Danger Zone</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Deleting a workspace&apos;s data isn&apos;t available from the
            dashboard yet. Take a backup first, then remove the local data
            directory listed under Storage &amp; Data.
          </p>
          <div className="mt-4">
            <Button
              variant="destructive"
              disabled
              title="Not available yet"
              className="h-9"
            >
              <RiDeleteBin6Line aria-hidden="true" className="h-4 w-4" />
              Delete Workspace
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
