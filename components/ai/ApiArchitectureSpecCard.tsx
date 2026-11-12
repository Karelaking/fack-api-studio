"use client";

// Disclosure headers use `role="button"` because they wrap a nested copy
// button; a native <button> cannot contain another interactive control.
/* eslint-disable jsx-a11y/prefer-tag-over-role */

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckTickCircleIcon,
  CopyIcon,
  File02Icon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Button } from "@/components/ui/button";

export interface ApiArchitectureSpecCardProps {
  detailedPrompt: string;
  detailedSummary?: string;
}

/**
 * Expandable architecture design specification card for Stage 2 AI prompt expansion.
 * Provides markdown prompt inspection and single-click clipboard copying.
 */
export const ApiArchitectureSpecCard = ({
  detailedPrompt,
  detailedSummary,
}: ApiArchitectureSpecCardProps): React.JSX.Element => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(detailedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="border-border/70 bg-card/60 flex flex-col rounded-xl border shadow-2xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {isExpanded ? (
            <PikaIcon
              icon={ChevronDownIcon}
              className="text-muted-foreground size-4 shrink-0"
            />
          ) : (
            <PikaIcon
              icon={ChevronRightIcon}
              className="text-muted-foreground size-4 shrink-0"
            />
          )}
          <PikaIcon
            icon={File02Icon}
            className="text-primary size-4 shrink-0"
          />
          <div className="flex flex-col text-left">
            <span className="text-foreground text-xs font-semibold">
              Architecture Design Specification
            </span>
            {detailedSummary && (
              <span className="text-muted-foreground text-caption line-clamp-1">
                {detailedSummary}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={handleCopy}>
            {copied ? (
              <span className="text-success flex items-center gap-1">
                <PikaIcon icon={CheckTickCircleIcon} className="size-3.5" />
                <span>Copied</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <PikaIcon icon={CopyIcon} className="size-3.5" />
                <span>Copy Spec</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-border/60 bg-muted/20 border-t p-4">
          <pre className="text-foreground/90 text-caption font-mono leading-relaxed whitespace-pre-wrap">
            {detailedPrompt}
          </pre>
        </div>
      )}
    </div>
  );
};
