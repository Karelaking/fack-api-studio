import React from "react";
import Link from "next/link";
import { RiKey2Line } from "@remixicon/react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeading, PageShell } from "@/components/dashboard/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "API Keys | Fack API",
  description: "Manage programmatic access to your Fack API workspace.",
};

export default function ApiKeysPage(): React.JSX.Element {
  return (
    <PageShell>
      <PageHeading
        title="API Keys"
        description="Long-lived credentials for driving the control plane from scripts and CI."
        actions={<Badge variant="outline">Not available yet</Badge>}
      />

      <EmptyState
        icon={<RiKey2Line />}
        title="Control-plane keys aren't available in this build"
        description="Dashboard access is handled by your sign-in provider, and routes that require auth issue HMAC-signed mock Bearer tokens from the route editor. A separate key for CI is not implemented."
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
