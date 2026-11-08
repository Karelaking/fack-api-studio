import React from "react";
import Link from "next/link";
import { RiEarthLine } from "@remixicon/react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeading, PageShell } from "@/components/dashboard/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Custom Domains | Fack API",
  description: "Manage custom domains for your mock API endpoints.",
};

export default function DomainsPage(): React.JSX.Element {
  return (
    <PageShell>
      <PageHeading
        title="Custom Domains"
        description="Serve a project from a hostname of your own instead of this deployment's address."
        actions={<Badge variant="outline">Not available yet</Badge>}
      />

      <EmptyState
        icon={<RiEarthLine />}
        title="Domain mapping isn't available in this build"
        description={
          <>
            Mocks are served from this deployment&apos;s host — under{" "}
            <code className="bg-muted text-caption rounded-sm px-1 py-0.5 font-mono">
              /&lt;project-slug&gt;/
            </code>{" "}
            or a project subdomain when subdomain routing is configured.
          </>
        }
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Browse projects
          </Button>
        }
      />
    </PageShell>
  );
}
