import * as React from "react";
import { cn } from "@/lib/utils";

export { PageHeading, type PageHeadingProps } from "./PageHeading";

export type PageShellProps = React.ComponentProps<"div">;

/**
 * The shared frame for every dashboard surface.
 * Standardizes container max width, padding rhythm, and responsive gutters.
 */
export const PageShell = ({
  className,
  children,
  ...props
}: PageShellProps): React.JSX.Element => {
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
};

export default PageShell;
