import React from "react";
import { desc, eq } from "drizzle-orm";
import { RiComputerLine, RiTerminalBoxLine } from "@remixicon/react";

import { db } from "@/db";
import { cliDevices } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import {
  CliDevicesList,
  type CliDeviceRow,
} from "@/components/dashboard/CliDevicesList";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeading, PageShell } from "@/components/dashboard/PageShell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CLI Access | Fack API",
  description: "Manage terminals authorized to access your Fack API workspace.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: Date | null): string | null {
  return value ? `${dateFormatter.format(value)} UTC` : null;
}

const TERMINAL_STEPS = [
  {
    title: "Sign in from your repository",
    description:
      "Opens Studio in your browser, then waits while you approve the code.",
    command: "fack login",
  },
  {
    title: "Pull the latest bundle",
    description:
      "With one project it selects automatically; with several it asks. The project key is written to .env.",
    command: "fack pull",
  },
  {
    title: "Run the mock server",
    description: "Serves the decrypted bundle locally on port 4000.",
    command: "fack dev",
  },
] as const;

export default async function CliAccessPage(): Promise<React.JSX.Element> {
  const userId = await requireUserId();

  const devices = await db.query.cliDevices.findMany({
    where: eq(cliDevices.userId, userId),
    orderBy: [desc(cliDevices.createdAt)],
  });

  const rows: CliDeviceRow[] = devices.map((device) => ({
    id: device.id,
    name: device.name,
    platform: device.platform,
    tokenPrefix: device.tokenPrefix,
    createdAt: formatDate(device.createdAt) ?? "Unknown",
    lastUsedAt: formatDate(device.lastUsedAt),
    revokedAt: formatDate(device.revokedAt),
  }));

  const activeCount = devices.filter((device) => !device.revokedAt).length;

  return (
    <PageShell className="max-w-4xl">
      <PageHeading
        title="CLI Access"
        description="Terminals authorized to pull encrypted bundles and project keys as you."
        actions={
          <Badge variant={activeCount > 0 ? "secondary" : "outline"}>
            {activeCount} active {activeCount === 1 ? "terminal" : "terminals"}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <RiTerminalBoxLine
              className="text-primary h-5 w-5"
              aria-hidden="true"
            />
            <span>Connect a terminal</span>
          </CardTitle>
          <CardDescription>
            Sign in once. The CLI lists your projects, picks the right one, and
            provisions the project key without copying secrets out of this
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3">
            {TERMINAL_STEPS.map((step, index) => (
              <li
                key={step.command}
                className="border-border/60 bg-muted/20 rounded-lg border p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="bg-primary/10 text-primary text-mini flex size-5 shrink-0 items-center justify-center rounded-full font-mono font-semibold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">
                      {step.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                      {step.description}
                    </p>
                    <code className="text-foreground/90 mt-2 block font-mono text-xs">
                      {step.command}
                    </code>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
            Self-hosting somewhere other than{" "}
            <code className="font-mono">http://localhost:3000</code>? Add{" "}
            <code className="font-mono">--url https://your-studio.example</code>{" "}
            to <code className="font-mono">fack login</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <RiComputerLine
              className="text-primary h-5 w-5"
              aria-hidden="true"
            />
            <span>Authorized terminals</span>
          </CardTitle>
          <CardDescription>
            Each row is one machine holding a credential. Revoke a terminal the
            moment you stop trusting it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <CliDevicesList devices={rows} />
          ) : (
            <EmptyState
              icon={<RiTerminalBoxLine />}
              title="No terminals yet"
              description="Run `fack login` in a repository to authorize this machine. It will appear here with its platform and last-used time."
              className="border-0 bg-transparent px-0 py-8 shadow-none"
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
