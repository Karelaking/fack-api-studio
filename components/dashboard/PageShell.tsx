import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The shared frame for every dashboard surface.
 *
 * Dashboard pages previously each invented their own padding and max width,
 * which made the project grid feel inset and the secondary pages feel
 * cramped. One frame keeps the page rhythm identical everywhere: the content
 * column stays readable on ultra-wide displays and the horizontal padding
 * scales with the viewport.
 */
export function PageShell({
  className,
  children,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1760px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12 2xl:px-16 2xl:py-10",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Shared page heading. Keeps the title/description spacing and measure the
 * same on every dashboard surface instead of each page re-deriving them.
 */
export function PageHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}
