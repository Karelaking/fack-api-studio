"use client";

import * as React from "react";
import { RiFileCopyLine, RiRouteLine } from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SelectedRouteDetailsProps {
  selectedRoute: {
    id: string;
    path: string;
    method: string;
    mockUrl: string;
  } | null;
}

/**
 * Inspector panel displaying the selected route's mock URL and query parameters helper list.
 */
export const SelectedRouteDetails = ({
  selectedRoute,
}: SelectedRouteDetailsProps): React.JSX.Element => {
  if (!selectedRoute) {
    return (
      <div className="bg-muted/20 border-border/40 mx-2 my-4 flex flex-col items-center justify-center rounded-lg border p-6 text-center">
        <RiRouteLine
          className="text-muted-foreground/60 mb-2 size-8"
          aria-hidden="true"
        />
        <p className="text-foreground text-xs font-semibold">
          No Route Selected
        </p>
        <p className="text-muted-foreground text-caption mt-1 max-w-44 leading-snug">
          Click any route node on the canvas to inspect its mock URL and query
          parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 px-2 py-2">
      {/* Method & Path Display */}
      <div className="bg-muted/30 border-border/50 flex items-center gap-2 rounded-md border p-2">
        <span
          className={cn(
            "shrink-0 rounded-sm border px-2 py-0.5 text-mini font-extrabold tracking-wider uppercase",
            selectedRoute.method.toUpperCase() === "GET" &&
              "border-method-get/25 bg-method-get/10 text-method-get",
            selectedRoute.method.toUpperCase() === "POST" &&
              "border-method-post/25 bg-method-post/10 text-method-post",
            selectedRoute.method.toUpperCase() === "PUT" &&
              "border-method-put/25 bg-method-put/10 text-method-put",
            selectedRoute.method.toUpperCase() === "DELETE" &&
              "border-method-delete/25 bg-method-delete/10 text-method-delete",
            selectedRoute.method.toUpperCase() === "PATCH" &&
              "border-method-patch/25 bg-method-patch/10 text-method-patch",
            !["GET", "POST", "PUT", "DELETE", "PATCH"].includes(
              selectedRoute.method.toUpperCase(),
            ) && "border-border/50 bg-muted/20 text-muted-foreground",
          )}
        >
          {selectedRoute.method}
        </span>
        <span className="text-foreground flex-1 truncate font-mono text-xs font-bold">
          {selectedRoute.path}
        </span>
      </div>

      {/* Base Link (Copyable Input-like box) */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-caption block px-0.5 font-bold tracking-wider uppercase">
          Mock URL
        </span>
        <div className="bg-card border-border/50 flex items-center gap-1.5 rounded-md border p-1.5 shadow-xs">
          <span className="text-foreground flex-1 truncate pl-1 font-mono text-xs leading-normal font-bold select-all">
            {selectedRoute.mockUrl}
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 transition-transform active:scale-90 md:h-7 md:w-7"
            title="Copy Mock Endpoint URL"
            aria-label="Copy Mock Endpoint URL"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(selectedRoute.mockUrl);
                toast.success("Mock link copied!");
              } catch {
                toast.error("Failed to copy link");
              }
            }}
          >
            <RiFileCopyLine className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Query Parameters Helper List */}
      <div className="space-y-1.5">
        <span className="text-muted-foreground text-caption block px-0.5 font-bold tracking-wider uppercase">
          Query Parameters
        </span>
        <div className="bg-muted/20 border-border/50 scrollbar-subtle max-h-48 space-y-1 overflow-y-auto rounded-md border p-2 pr-0.5">
          {[
            { param: "?limit=5", desc: "Limit output array items" },
            { param: "?q=search", desc: "Global text search" },
            {
              param: "?page=2&limit=5",
              desc: "Paginate mock output",
            },
            { param: "?sort=id&order=desc", desc: "Sort records" },
            { param: "?field=value", desc: "Exact field match" },
          ].map((opt, oIdx) => {
            const optUrl = `${selectedRoute.mockUrl}${opt.param}`;
            return (
              <div
                key={oIdx}
                className="hover:bg-background flex items-center justify-between gap-2 rounded-sm border border-transparent px-1.5 py-1 transition-colors"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-primary text-caption truncate font-mono leading-normal font-bold">
                    {opt.param}
                  </span>
                  <span className="text-muted-foreground text-mini truncate leading-normal">
                    {opt.desc}
                  </span>
                </div>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 transition-transform active:scale-90 md:h-6 md:w-6"
                  title="Copy parameter URL"
                  aria-label="Copy parameter URL"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(optUrl);
                      toast.success(`Copied parameter URL`);
                    } catch {
                      toast.error("Failed to copy link");
                    }
                  }}
                >
                  <RiFileCopyLine className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SelectedRouteDetails;
