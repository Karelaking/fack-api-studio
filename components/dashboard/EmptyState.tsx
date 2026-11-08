import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The dashboard's single empty-state pattern: a quiet dashed panel with an
 * icon, a plain-spoken title, and — when there is somewhere to go — one
 * primary action. Used by the secondary surfaces so they read as siblings of
 * the projects grid rather than as four separate designs.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  /** A single icon element; sized and coloured by the empty state. */
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "bg-card/30 border-border/50 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center shadow-sm sm:py-16",
        className,
      )}
    >
      <div className="bg-primary/10 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <span
          aria-hidden="true"
          className="flex items-center justify-center [&>svg]:h-7 [&>svg]:w-7"
        >
          {icon}
        </span>
      </div>
      <h2 className="text-foreground text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
