"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  RefreshIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Error boundary for the project page.
 * Catches runtime errors (DB failures, action errors, etc.) and provides
 * a retry mechanism without navigating away.
 */
export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProjectError]", error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
      <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
        <PikaIcon
          icon={AlertTriangleIcon}
          className="text-destructive size-8"
        />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-xl font-semibold">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          An unexpected error occurred while loading this project. This is
          usually temporary — try again or head back to the dashboard.
        </p>
        {error.digest && (
          <p className="text-muted-foreground/60 mt-1 font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="default" size="sm">
          <PikaIcon icon={RefreshIcon} className="mr-2 size-4" />
          Try Again
        </Button>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <PikaIcon icon={ArrowLeftIcon} className="mr-2 size-4" />
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
