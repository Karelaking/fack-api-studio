"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PikaiconRenderer } from "./HugeiconRenderer";

export interface EndpointGroupIconCellProps {
  iconName: string;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

/**
 * Individual memoized Pikaicon cell button in the endpoint group customizer grid.
 */
export const EndpointGroupIconCell = React.memo(
  ({
    iconName,
    isSelected,
    onSelect,
  }: EndpointGroupIconCellProps): React.JSX.Element => {
    return (
      <button
        type="button"
        onClick={() => onSelect(iconName)}
        title={iconName}
        aria-label={iconName}
        aria-pressed={isSelected}
        className={cn(
          "size-9 rounded-md flex items-center justify-center transition-all cursor-pointer relative",
          "border border-transparent hover:border-border hover:bg-muted/80 active:scale-95",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden",
          isSelected
            ? "bg-primary/20 text-primary border-primary ring-2 ring-primary ring-offset-1 ring-offset-background shadow-xs font-bold"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <PikaiconRenderer name={iconName} size={18} />
      </button>
    );
  },
);

EndpointGroupIconCell.displayName = "EndpointGroupIconCell";

export default EndpointGroupIconCell;
