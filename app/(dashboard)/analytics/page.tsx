import React from "react";
import Link from "next/link";
import { RiBarChartBoxLine } from "@remixicon/react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeading, PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Analytics | Fack API",
  description: "View usage statistics and traffic trends.",
};

/**
 * Cross-project analytics.
 *
 * The numbers are derived from request logs, so an empty install has nothing
 * truthful to chart. Showing a zeroed metric row here only taught people that
 * the page was decorative; the empty state says what has to happen instead.
 */
export default function AnalyticsPage(): React.JSX.Element {
  return (
    <PageShell>
      <PageHeading
        title="Analytics"
        description="Traffic, bandwidth, and latency across every project, rolled up from the request logs."
      />

      <EmptyState
        icon={<RiBarChartBoxLine />}
        title="No traffic to chart yet"
        description="Serve a few requests from a project endpoint and the trends for the last 24 hours will appear here."
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
