"use client";

import * as React from "react";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Button } from "@/components/ui/button";

export interface FieldPropertyEditorFooterProps {
  fieldName: string;
  loading: boolean;
  canSave: boolean;
  onRemove: () => Promise<void>;
  onSave: () => Promise<void>;
}

/**
 * Bottom action footer for FieldPropertyEditor with Remove and Save buttons.
 */
export const FieldPropertyEditorFooter = ({
  fieldName,
  loading,
  canSave,
  onRemove,
  onSave,
}: FieldPropertyEditorFooterProps): React.JSX.Element => {
  return (
    <div className="border-border/60 flex shrink-0 items-center justify-between border-t px-4 py-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={loading}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
        aria-label={`Remove field ${fieldName}`}
      >
        {loading ? (
          <PikaIcon
            icon={PikaCore.RefreshIcon}
            size={14}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <PikaIcon
            icon={PikaCore.DeleteDustbin01Icon}
            size={14}
            aria-hidden="true"
          />
        )}
        <span>Remove</span>
      </Button>

      <Button
        type="button"
        size="sm"
        onClick={onSave}
        disabled={loading || !canSave}
        className="text-xs"
        aria-label="Save field changes (Ctrl+S / Cmd+S)"
      >
        {loading ? (
          <PikaIcon
            icon={PikaCore.RefreshIcon}
            size={14}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <PikaIcon icon={PikaCore.FloppyIcon} size={14} aria-hidden="true" />
        )}
        <span>Save</span>
      </Button>
    </div>
  );
};

export default FieldPropertyEditorFooter;
