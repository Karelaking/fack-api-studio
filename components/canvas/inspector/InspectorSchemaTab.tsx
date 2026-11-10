"use client";

import * as React from "react";
import { RiCheckLine, RiFileCopyLine, RiCodeLine } from "@remixicon/react";
import type { SchemaField } from "@/lib/schema-synthesizer";
import { FieldTree } from "@/components/edit-bar/FieldTree";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InspectorSchemaTabProps {
  fields: SchemaField[];
  loading: boolean;
  copiedJson: boolean;
  onCopySchema: () => Promise<void>;
  onOpenTypes: () => void;
  onClearAllFields: () => Promise<void>;
}

export const InspectorSchemaTab = ({
  fields,
  loading,
  copiedJson,
  onCopySchema,
  onOpenTypes,
  onClearAllFields,
}: InspectorSchemaTabProps): React.JSX.Element => {
  const [clearAllOpen, setClearAllOpen] = React.useState(false);

  return (
    <TabsContent
      value="schema"
      className="scrollbar-subtle m-0 min-h-0 flex-1 overflow-y-auto px-4 py-3"
    >
      <div className="space-y-3">
        <div className="border-border/50 flex items-center justify-between border-b pb-2">
          <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
            Schema Tools
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void onCopySchema()}
              className="h-7 gap-1 text-xs font-medium"
            >
              {copiedJson ? (
                <RiCheckLine className="text-success size-3.5" />
              ) : (
                <RiFileCopyLine className="size-3.5" />
              )}
              <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onOpenTypes}
              className="h-7 gap-1 text-xs font-medium"
            >
              <RiCodeLine className="size-3.5" />
              <span>Types</span>
            </Button>
            {fields.length > 0 && (
              <Popover open={clearAllOpen} onOpenChange={setClearAllOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={loading}
                      className="text-muted-foreground hover:text-destructive h-7 text-xs font-medium"
                    >
                      Clear all
                    </Button>
                  }
                />
                <PopoverContent
                  align="end"
                  side="bottom"
                  className="w-56 p-3 shadow-md"
                >
                  <div className="space-y-2">
                    <p className="text-foreground text-xs font-semibold">
                      Clear all fields?
                    </p>
                    <p className="text-muted-foreground text-xs leading-snug">
                      This will remove all {fields.length} schema fields from
                      this route.
                    </p>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => setClearAllOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="destructive"
                        onClick={() => {
                          setClearAllOpen(false);
                          void onClearAllFields();
                        }}
                      >
                        Clear all
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Interactive Field Tree */}
        <FieldTree />
      </div>
    </TabsContent>
  );
};
