"use client";

import * as React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { RefreshIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import {
  FlowCanvasViewport,
  type FlowCanvasViewportProps,
} from "./FlowCanvasViewport";

export type FlowCanvasProps = FlowCanvasViewportProps;

/**
 * FlowCanvas component wrapped in ReactFlowProvider to enable useReactFlow hook bindings.
 */
export const FlowCanvas = (props: FlowCanvasProps): React.JSX.Element => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <output className="bg-card text-muted-foreground relative flex h-full w-full flex-col items-center justify-center gap-2">
        <PikaIcon
          icon={RefreshIcon}
          size={32}
          className="h-8 w-8 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="text-xs font-medium">Loading canvas…</span>
      </output>
    );
  }

  return (
    <ReactFlowProvider>
      <FlowCanvasViewport {...props} />
    </ReactFlowProvider>
  );
};

export default FlowCanvas;
