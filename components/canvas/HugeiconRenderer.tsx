"use client";

import * as React from "react";
import { PikaIcon, type IconSvgElement } from "@pikaicons/react";
import * as PikaCore from "@pikaicons/core-free";

interface PikaiconRendererProps {
  name?: string | null;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

type PikaIconData = IconSvgElement;

/**
 * Resolves an icon name against @pikaicons/core-free with automatic fallback.
 * Maps legacy icon names seamlessly to Pikaicons equivalents.
 */
export function resolvePikaicon(name?: string | null): PikaIconData {
  if (!name) {
    return PikaCore.FolderIcon;
  }

  const trimmed = name.trim();
  const iconsRecord = PikaCore as unknown as Record<
    string,
    PikaIconData | undefined
  >;

  // Direct match (e.g. "AirplaneIcon")
  if (iconsRecord[trimmed]) {
    return iconsRecord[trimmed]!;
  }

  // Appended with Icon (e.g. "Airplane" -> "AirplaneIcon")
  if (iconsRecord[`${trimmed}Icon`]) {
    return iconsRecord[`${trimmed}Icon`]!;
  }

  // Case-insensitive match
  const lower = trimmed.toLowerCase();
  const matchKey = Object.keys(PikaCore).find(
    (k) => k.toLowerCase() === lower || k.toLowerCase() === `${lower}icon`,
  );
  if (matchKey && iconsRecord[matchKey]) {
    return iconsRecord[matchKey]!;
  }

  // Default fallback
  return PikaCore.FolderIcon;
}

// Backwards compatibility alias
export const resolveHugeicon = resolvePikaicon;

/**
 * Lightweight, resilient icon renderer powered by Pikaicons (https://pikaicons.com/).
 * Supports all 990+ hand-crafted free Pikaicons with zero runtime failure and fallback safety.
 */
export const PikaiconRenderer = React.memo(
  ({
    name,
    size = 16,
    color,
    strokeWidth = 2,
    className,
    style,
    "aria-hidden": ariaHidden = true,
  }: PikaiconRendererProps): React.JSX.Element => {
    const icon = React.useMemo(() => resolvePikaicon(name), [name]);

    return (
      <PikaIcon
        icon={icon}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
        style={style}
        aria-hidden={ariaHidden}
      />
    );
  },
);

PikaiconRenderer.displayName = "PikaiconRenderer";

// Alias for backwards compatibility with existing imports
export { PikaiconRenderer as HugeiconRenderer };

export default PikaiconRenderer;
