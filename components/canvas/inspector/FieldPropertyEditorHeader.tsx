"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";

export interface FieldPropertyEditorHeaderProps {
  method: string;
  path: string;
  onBack: () => void;
}

/**
 * Top header bar for the Field Property Editor.
 * Provides a back navigation button, editor title, and route method & path badge.
 */
export const FieldPropertyEditorHeader = ({
  method,
  path,
  onBack,
}: FieldPropertyEditorHeaderProps): React.JSX.Element => {
  return (
    <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-3 py-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex size-8 items-center justify-center rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
          aria-label="Back to route inspection"
        >
          <PikaIcon
            icon={PikaCore.ChevronLeftIcon}
            size={16}
            aria-hidden="true"
          />
        </button>
        <div className="flex flex-col">
          <h2 className="text-foreground text-xs font-semibold">
            Field Property Editor
          </h2>
          <span className="text-muted-foreground font-mono text-xs">
            {method} {path}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FieldPropertyEditorHeader;
