import React from "react";
import Link from "next/link";
import { PikaIcon } from "@pikaicons/react";
import { ClockIcon, File02Icon } from "@pikaicons/core-free";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeading, PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/button";
import { getWorkspaceActivityLogs } from "@/lib/actions/logs";
import { cn } from "@/lib/utils";
import {
  getLatencyBadgeClass,
  getMethodBadgeClass,
  getStatusBadgeClass,
} from "@/lib/utils/method-colors";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activity Logs | Fack API",
  description: "Monitor incoming requests to your mock APIs.",
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (isToday) {
    return timeStr;
  }
  const dateStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} ${timeStr}`;
}

export default async function ActivityLogsPage(): Promise<React.JSX.Element> {
  const logs = await getWorkspaceActivityLogs(100);

  return (
    <PageShell>
      <PageHeading
        title="Activity Logs"
        description="Every request your mock APIs serve, captured across all projects with its method, path, status, and latency."
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={<PikaIcon icon={File02Icon} />}
          title="No requests recorded yet"
          description="Request logs live inside each project. Once incoming traffic arrives on your mock endpoints, it will appear here."
          action={
            <Button variant="outline" asChild>
              <Link href="/dashboard">Browse projects</Link>
            </Button>
          }
        />
      ) : (
        <div className="bg-card border-border/60 overflow-hidden rounded border">
          <div className="bg-muted/40 text-muted-foreground border-border/40 text-micro flex items-center gap-4 border-b px-4 py-2 font-bold tracking-wider uppercase">
            <span className="min-w-28 shrink-0">Time</span>
            <span className="min-w-32 shrink-0">Project</span>
            <span className="w-16 shrink-0">Method</span>
            <span className="flex-1">Request Path</span>
            <span className="hidden w-16 text-right sm:inline-block">
              Latency
            </span>
            <span className="w-16 text-right">Status</span>
          </div>
          <div className="divide-border/30 divide-y">
            {logs.map((log) => {
              const projectTarget = log.projectSlug
                ? `/projects/${log.projectSlug}/logs`
                : "/dashboard";

              return (
                <div
                  key={log.id}
                  className="hover:bg-muted/10 flex items-center gap-4 px-4 py-3 text-xs font-medium transition-colors"
                >
                  <span className="text-muted-foreground/70 text-micro flex min-w-28 shrink-0 items-center gap-1 font-mono">
                    <PikaIcon icon={ClockIcon} className="size-3 shrink-0" />
                    {formatTimestamp(log.timestamp)}
                  </span>

                  <span className="min-w-32 shrink-0 truncate">
                    <Link
                      href={projectTarget}
                      className="text-foreground hover:text-primary font-medium transition-colors hover:underline"
                    >
                      {log.projectName || "Unknown Project"}
                    </Link>
                  </span>

                  <span className="w-16 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-micro font-bold tracking-wider uppercase",
                        getMethodBadgeClass(log.method),
                      )}
                    >
                      {log.method}
                    </span>
                  </span>

                  <span className="text-foreground flex-1 truncate font-mono">
                    {log.path}
                  </span>

                  <span className="hidden w-16 text-right sm:inline-block">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded border px-1 py-0.5 font-mono text-mini",
                        getLatencyBadgeClass(log.latency),
                      )}
                    >
                      {log.latency}ms
                    </span>
                  </span>

                  <span className="w-16 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded border px-2 py-0.5 font-mono text-mini font-bold",
                        getStatusBadgeClass(log.statusCode),
                      )}
                    >
                      {log.statusCode}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
