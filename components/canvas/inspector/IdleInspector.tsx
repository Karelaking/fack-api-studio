"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";

interface IdleInspectorProps {
  activeRoutesCount: number;
}

export const IdleInspector = ({
  activeRoutesCount,
}: IdleInspectorProps): React.JSX.Element => {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border/60 flex shrink-0 items-center border-b px-4 py-3">
        <h2 className="text-foreground text-xs font-semibold">
          Node Inspector
        </h2>
      </div>

      {/* Empty State Body */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="bg-muted/40 border-border/60 mb-3 flex size-12 items-center justify-center rounded-xl border">
          <PikaIcon
            icon={PikaCore.GitBranchIcon}
            size={24}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <h3 className="text-foreground text-xs font-semibold">
          No Node Selected
        </h3>
        <p className="text-muted-foreground mt-1.5 max-w-56 text-xs leading-relaxed">
          Click a route&apos;s pencil button to inspect and edit its properties,
          or click a field badge to edit that field&apos;s type and mock
          provider.
        </p>

        <div className="bg-muted/30 border-border/50 mt-6 w-full rounded-lg border p-3 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Active Canvas Routes</span>
            <span className="text-foreground font-mono font-semibold">
              {activeRoutesCount}
            </span>
          </div>
          <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
            <PikaIcon
              icon={PikaCore.SparkleAi01Icon}
              size={12}
              className="text-primary shrink-0"
              aria-hidden="true"
            />
            <span>Drag providers from the left sidebar onto any route.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
