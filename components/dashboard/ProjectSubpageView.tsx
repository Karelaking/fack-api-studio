"use client";

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import { SubpageLoading } from "@/app/projects/[...slug]/_components/SubpageLoading";
import type { CanvasContainer } from "@/components/canvas/CanvasContainer";
import type { ProjectEndpoints } from "@/components/dashboard/ProjectEndpoints";
import type { ProjectLogs } from "@/components/dashboard/ProjectLogs";
import type { ProjectNotes } from "@/components/dashboard/ProjectNotes";
import type { ProjectSettings } from "@/components/dashboard/ProjectSettings";

export type ProjectSubpageViewProps =
  | { subpage: "canvas"; props: ComponentProps<typeof CanvasContainer> }
  | { subpage: "endpoints"; props: ComponentProps<typeof ProjectEndpoints> }
  | { subpage: "logs"; props: ComponentProps<typeof ProjectLogs> }
  | { subpage: "notes"; props: ComponentProps<typeof ProjectNotes> }
  | { subpage: "settings"; props: ComponentProps<typeof ProjectSettings> };

const LazyCanvasContainer = dynamic(
  () =>
    import("@/components/canvas/CanvasContainer").then(
      (mod) => mod.CanvasContainer,
    ),
  {
    ssr: false,
    loading: () => <SubpageLoading subpage="canvas" />,
  },
);

const LazyProjectEndpoints = dynamic(
  () =>
    import("@/components/dashboard/ProjectEndpoints").then(
      (mod) => mod.ProjectEndpoints,
    ),
  {
    loading: () => <SubpageLoading subpage="endpoints" />,
  },
);

const LazyProjectLogs = dynamic(
  () =>
    import("@/components/dashboard/ProjectLogs").then((mod) => mod.ProjectLogs),
  {
    loading: () => <SubpageLoading subpage="logs" />,
  },
);

const LazyProjectNotes = dynamic(
  () =>
    import("@/components/dashboard/ProjectNotes").then(
      (mod) => mod.ProjectNotes,
    ),
  {
    loading: () => <SubpageLoading subpage="notes" />,
  },
);

const LazyProjectSettings = dynamic(
  () =>
    import("@/components/dashboard/ProjectSettings").then(
      (mod) => mod.ProjectSettings,
    ),
  {
    loading: () => <SubpageLoading subpage="settings" />,
  },
);

/**
 * Client-side code-splitting dispatcher for project subpages.
 * Isolates heavy bundles (e.g. @xyflow/react and @dnd-kit on Canvas) into
 * dedicated async chunks so non-canvas subpages never download them.
 */
export const ProjectSubpageView = (
  view: ProjectSubpageViewProps,
): React.JSX.Element => {
  switch (view.subpage) {
    case "canvas":
      return <LazyCanvasContainer {...view.props} />;
    case "endpoints":
      return <LazyProjectEndpoints {...view.props} />;
    case "logs":
      return <LazyProjectLogs {...view.props} />;
    case "notes":
      return <LazyProjectNotes {...view.props} />;
    case "settings":
      return <LazyProjectSettings {...view.props} />;
  }
};
