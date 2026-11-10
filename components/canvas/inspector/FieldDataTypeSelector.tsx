"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FIELD_TYPES, type FieldType } from "./inspector.types";

export interface FieldDataTypeSelectorProps {
  type: FieldType;
  onChangeType: (type: FieldType) => void;
  disabled?: boolean;
}

/**
 * Data type selector pill buttons for a schema field (string, number, boolean, array, object, null).
 */
export const FieldDataTypeSelector = ({
  type,
  onChangeType,
  disabled = false,
}: FieldDataTypeSelectorProps): React.JSX.Element => {
  return (
    <div className="space-y-1.5">
      <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
        Data Type
      </span>
      <fieldset
        aria-label="Data type"
        className="m-0 flex flex-wrap gap-1 border-0 p-0"
      >
        {FIELD_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => onChangeType(t)}
            disabled={disabled}
            className={cn(
              "h-7 min-w-10 rounded-md border px-2.5 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              type === t
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </fieldset>
    </div>
  );
};

export default FieldDataTypeSelector;
