import React from "react";
import Link from "next/link";
import { RiFileList3Line } from "@remixicon/react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeading, PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Activity Logs | Fack API",
  description: "Monitor incoming requests to your mock APIs.",
};

export default function ActivityLogsPage(): React.JSX.Element {
  return (
    <PageShell>
      <PageHeading
        title="Activity Logs"
        description="Every request your mock APIs serve, captured per workspace with its method, path, status, and latency."
      />

      <EmptyState
        icon={<RiFileList3Line />}
        title="No requests recorded yet"
        description="Request logs live inside each workspace. Open one and switch to Logs to watch traffic arrive as it happens."
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Browse workspaces
          </Button>
        }
      />
    </PageShell>
  );
}
