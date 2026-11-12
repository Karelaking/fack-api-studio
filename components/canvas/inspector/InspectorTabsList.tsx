"use client";

import * as React from "react";
import {
  FilterHorizontalIcon,
  File02Icon,
  GraphTrendLineIcon,
  PlayCircleIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface InspectorTabsListProps {
  headersCount: number;
  fieldsCount: number;
  hasChaos: boolean;
  rulesCount: number;
}

/**
 * Categorized Tab navigation triggers for Route Editor (Route, Schema, Behavior, Try).
 */
export const InspectorTabsList = ({
  headersCount,
  fieldsCount,
  hasChaos,
  rulesCount,
}: InspectorTabsListProps): React.JSX.Element => {
  return (
    <TabsList className="bg-muted/30 border-border/60 grid shrink-0 grid-cols-4 border-b p-1">
      <TabsTrigger
        value="route"
        size="compact"
        className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
        title="Route, Status & Headers (⌥1)"
      >
        <PikaIcon
          icon={FilterHorizontalIcon}
          className="size-3.5 shrink-0"
          aria-hidden="true"
        />
        <span className="truncate">Route</span>
        {headersCount > 0 && (
          <span className="bg-info/15 text-info py-0.2 rounded px-1.5 font-mono text-xs font-bold">
            {headersCount}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger
        value="schema"
        size="compact"
        className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
        title="Response Schema & Types (⌥2)"
      >
        <PikaIcon
          icon={File02Icon}
          className="size-3.5 shrink-0"
          aria-hidden="true"
        />
        <span className="truncate">Schema</span>
        <span className="bg-muted-foreground/15 text-muted-foreground py-0.2 rounded px-1.5 font-mono text-xs">
          {fieldsCount}
        </span>
      </TabsTrigger>
      <TabsTrigger
        value="behavior"
        size="compact"
        className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
        title="Chaos Simulation & Rules (⌥3)"
      >
        <PikaIcon
          icon={GraphTrendLineIcon}
          className="size-3.5 shrink-0"
          aria-hidden="true"
        />
        <span className="truncate">Behavior</span>
        {hasChaos ? (
          <span className="bg-warning/15 text-warning py-0.2 rounded px-1.5 font-mono text-xs font-bold">
            ON
          </span>
        ) : rulesCount > 0 ? (
          <span className="bg-primary/15 text-primary py-0.2 rounded px-1.5 font-mono text-xs font-bold">
            {rulesCount}
          </span>
        ) : null}
      </TabsTrigger>
      <TabsTrigger
        value="try"
        size="compact"
        className="gap-1 px-1.5 py-1 text-xs font-medium transition-all"
        title="Try Live Request (⌥4)"
      >
        <PikaIcon
          icon={PlayCircleIcon}
          className="size-3.5 shrink-0"
          aria-hidden="true"
        />
        <span className="truncate">Try</span>
      </TabsTrigger>
    </TabsList>
  );
};

export default InspectorTabsList;
