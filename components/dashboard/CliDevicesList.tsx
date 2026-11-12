"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshIcon, LaptopIcon, ShieldCheckIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";

import { revokeCliDeviceAction } from "@/app/(dashboard)/keys/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CliDeviceTimelineLabel } from "./CliDeviceTimelineLabel";

export interface CliDeviceRow {
  id: string;
  name: string;
  platform: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/**
 * Authorized terminal list with a two-step revoke. Revoking is immediate and
 * server-side; the list refreshes from the new server render.
 */
export function CliDevicesList({
  devices,
}: {
  devices: CliDeviceRow[];
}): React.JSX.Element {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  async function onRevoke(deviceId: string): Promise<void> {
    setRevokingId(deviceId);
    try {
      const result = await revokeCliDeviceAction(deviceId);
      if (!result.ok) {
        toast.error("Couldn't revoke terminal", {
          description: result.error,
        });
        return;
      }

      toast.success("Terminal revoked", {
        description: "The next request from that device will fail.",
      });
      setConfirmingId(null);
      router.refresh();
    } catch {
      toast.error("Couldn't revoke terminal", {
        description: "Check your connection and try again.",
      });
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <ul className="divide-border/60 flex flex-col divide-y">
      {devices.map((device) => {
        const revoked = Boolean(device.revokedAt);
        const confirming = confirmingId === device.id;
        const revoking = revokingId === device.id;

        return (
          <li
            key={device.id}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={
                  revoked
                    ? "bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
                    : "bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg"
                }
              >
                {device.platform === "unknown" ? (
                  <PikaIcon
                    icon={LaptopIcon}
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : (
                  <PikaIcon
                    icon={ShieldCheckIcon}
                    className="size-4"
                    aria-hidden="true"
                  />
                )}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-foreground truncate text-sm font-medium">
                    {device.name}
                  </p>
                  <Badge variant={revoked ? "outline" : "secondary"}>
                    {revoked ? "Revoked" : "Active"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                  {device.tokenPrefix}•••• ·{" "}
                  <span className="font-sans capitalize">
                    {device.platform}
                  </span>
                </p>

                <dl className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5">
                  <CliDeviceTimelineLabel
                    label="Authorized"
                    value={device.createdAt}
                  />
                  <CliDeviceTimelineLabel
                    label="Last used"
                    value={device.lastUsedAt ?? "Never"}
                  />
                </dl>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:pl-4">
              {revoked ? (
                <span className="text-muted-foreground text-xs">No access</span>
              ) : confirming ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void onRevoke(device.id)}
                    disabled={revoking}
                  >
                    {revoking ? (
                      <PikaIcon
                        icon={RefreshIcon}
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    Revoke
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingId(null)}
                    disabled={revoking}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingId(device.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
