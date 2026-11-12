"use client";

import * as React from "react";
import {
  DeleteDustbin01Icon,
  FloppyIcon,
  RefreshIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Button } from "@/components/ui/button";

interface RouteInspectorFooterProps {
  confirmDelete: boolean;
  setConfirmDelete: (confirm: boolean) => void;
  isDeleting: boolean;
  onDeleteRoute: () => Promise<void>;
  loading: boolean;
  isDirty: boolean;
  path: string;
  onSaveRoute: () => Promise<void>;
}

export const RouteInspectorFooter = ({
  confirmDelete,
  setConfirmDelete,
  isDeleting,
  onDeleteRoute,
  loading,
  isDirty,
  path,
  onSaveRoute,
}: RouteInspectorFooterProps): React.JSX.Element => {
  return (
    <div className="border-border/60 bg-card flex shrink-0 items-center justify-between border-t px-4 py-3">
      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={() => void onDeleteRoute()}
            disabled={isDeleting || loading}
          >
            {isDeleting ? (
              <PikaIcon
                icon={RefreshIcon}
                size={12}
                className="mr-1 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              "Confirm Delete"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setConfirmDelete(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          disabled={loading}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
          aria-label="Delete this route"
        >
          <PikaIcon icon={DeleteDustbin01Icon} size={14} aria-hidden="true" />
          <span>Delete Route</span>
        </Button>
      )}

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={isDirty ? "default" : "secondary"}
          onClick={onSaveRoute}
          disabled={loading || !path.trim()}
          className="text-xs"
          aria-label="Save route changes (Ctrl+S / Cmd+S)"
          title="Save route changes (Ctrl+S / Cmd+S)"
        >
          {loading ? (
            <PikaIcon
              icon={RefreshIcon}
              size={14}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <PikaIcon icon={FloppyIcon} size={14} aria-hidden="true" />
          )}
          <span>Save Route</span>
        </Button>
      </div>
    </div>
  );
};
