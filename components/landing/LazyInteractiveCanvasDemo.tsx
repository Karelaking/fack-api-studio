"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const InteractiveCanvasDemoClient = dynamic(
  () =>
    import("./InteractiveCanvasDemo").then((mod) => mod.InteractiveCanvasDemo),
  {
    loading: (): React.JSX.Element => (
      <div className="bg-background border-border/40 w-full border-b py-16 md:py-24">
        <div className="border-border/40 mx-auto max-w-7xl border-x px-4 sm:px-6 lg:px-8">
          <div className="border-border/40 overflow-hidden rounded-xl border">
            <Skeleton className="h-112.5 w-full" />
          </div>
        </div>
      </div>
    ),
  },
);

/**
 * Client-side lazy boundary for InteractiveCanvasDemo so its JavaScript chunk
 * is code-split away from initial landing page hydration in Next.js App Router.
 */
export const LazyInteractiveCanvasDemo = (): React.JSX.Element => {
  return <InteractiveCanvasDemoClient />;
};
