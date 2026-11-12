import { RefreshIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";

/**
 * Root-level loading state.
 * Displays a neutral, lightweight spinner during top-level route transitions.
 */
export default function RootLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <PikaIcon
        icon={RefreshIcon}
        className="text-muted-foreground size-8 animate-spin"
      />
    </div>
  );
}
