import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeadingProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared page heading for dashboard views.
 * Standardizes title, description, and action button positioning.
 */
export const PageHeading = ({
  title,
  description,
  actions,
  className,
}: PageHeadingProps): React.JSX.Element => {
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
};

export default PageHeading;
