"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import * as CoreIcons from "@hugeicons/core-free-icons";

interface HugeiconRendererProps {
  name?: string | null;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

type IconData = (typeof CoreIcons)[keyof typeof CoreIcons];

/**
 * Resolves an icon name against @hugeicons/core-free-icons with automatic fallback.
 */
export function resolveHugeicon(name?: string | null): IconData {
  if (!name) {
    return CoreIcons.Folder01Icon;
  }

  const trimmed = name.trim();
  const iconsRecord = CoreIcons as unknown as Record<string, IconData>;

  // Direct match (e.g. "Folder01Icon")
  if (iconsRecord[trimmed]) {
    return iconsRecord[trimmed];
  }

  // Appended with Icon (e.g. "Folder01" -> "Folder01Icon")
  if (iconsRecord[`${trimmed}Icon`]) {
    return iconsRecord[`${trimmed}Icon`];
  }

  return CoreIcons.Folder01Icon;
}

/**
 * Lightweight, resilient icon renderer powered by Hugeicons.
 * Supports over 6,700+ free icons with zero runtime failure and fallback safety.
 */
export const HugeiconRenderer = React.memo(
  ({
    name,
    size = 16,
    color,
    className,
    style,
    "aria-hidden": ariaHidden = true,
  }: HugeiconRendererProps): React.JSX.Element => {
    const icon = React.useMemo(() => resolveHugeicon(name), [name]);

    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        color={color}
        className={className}
        style={style}
        aria-hidden={ariaHidden}
      />
    );
  },
);

HugeiconRenderer.displayName = "HugeiconRenderer";

export default HugeiconRenderer;
