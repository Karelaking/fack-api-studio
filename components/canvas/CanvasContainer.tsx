"use client";

import * as React from "react";
import { AgentStoreProvider } from "@/stores/agent-store-provider";
import { CanvasWorkspace, type CanvasWorkspaceProps } from "./CanvasWorkspace";

export type CanvasContainerProps = CanvasWorkspaceProps;

/**
 * Root Canvas Container component.
 * Wraps the canvas workspace with the project-scoped AgentStoreProvider.
 */
export const CanvasContainer = (
  props: CanvasContainerProps,
): React.JSX.Element => {
  return (
    <AgentStoreProvider projectId={props.projectId}>
      <CanvasWorkspace {...props} />
    </AgentStoreProvider>
  );
};

export default CanvasContainer;
