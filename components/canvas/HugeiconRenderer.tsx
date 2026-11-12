"use client";

import * as React from "react";
import { PikaIcon, type IconSvgElement } from "@pikaicons/react";
import { FolderIcon } from "@pikaicons/core-free";

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
type PikaIconsRecord = Record<string, PikaIconData | undefined>;

const STATIC_ICONS: PikaIconsRecord = {
  Folder: FolderIcon,
  FolderIcon,
};

let loadedIconsRecord: PikaIconsRecord | undefined;
let loadedIconsLowercaseMap: Map<string, PikaIconData> | undefined;
let pikaCoreLoadPromise: Promise<void> | undefined;

function buildLowercaseIndex(
  record: PikaIconsRecord,
): Map<string, PikaIconData> {
  const index = new Map<string, PikaIconData>();
  for (const [key, value] of Object.entries(record)) {
    if (key.endsWith("Icon") && Array.isArray(value)) {
      index.set(key.toLowerCase(), value);
    }
  }
  return index;
}

function loadPikaCoreModule(): Promise<void> {
  if (!pikaCoreLoadPromise) {
    pikaCoreLoadPromise = import("@pikaicons/core-free").then((mod) => {
      const record = mod as unknown as PikaIconsRecord;
      loadedIconsRecord = record;
      loadedIconsLowercaseMap = buildLowercaseIndex(record);
    });
  }
  return pikaCoreLoadPromise;
}

function lookupPikaiconExact(name?: string | null): PikaIconData | undefined {
  if (!name) {
    return FolderIcon;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return FolderIcon;
  }

  const staticHit = STATIC_ICONS[trimmed] ?? STATIC_ICONS[`${trimmed}Icon`];
  if (staticHit) {
    return staticHit;
  }

  if (loadedIconsRecord && loadedIconsLowercaseMap) {
    const directHit =
      loadedIconsRecord[trimmed] ?? loadedIconsRecord[`${trimmed}Icon`];
    if (directHit) {
      return directHit;
    }

    const lower = trimmed.toLowerCase();
    return (
      loadedIconsLowercaseMap.get(lower) ??
      loadedIconsLowercaseMap.get(`${lower}icon`)
    );
  }

  return undefined;
}

/**
 * Resolves an icon name against cached icons or @pikaicons/core-free once loaded, with FolderIcon fallback.
 */
export function resolvePikaicon(name?: string | null): PikaIconData {
  return lookupPikaiconExact(name) ?? FolderIcon;
}

// Backwards compatibility alias
export const resolveHugeicon = resolvePikaicon;

/**
 * Lightweight, resilient icon renderer powered by Pikaicons (https://pikaicons.com/).
 * Resolves FolderIcon synchronously and lazily loads the full icon catalog only for custom icon names.
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
    const [, setCatalogVersion] = React.useState(0);

    React.useEffect(() => {
      if (!name || lookupPikaiconExact(name) || loadedIconsRecord) {
        return;
      }

      let cancelled = false;
      void loadPikaCoreModule().then(() => {
        if (!cancelled) {
          setCatalogVersion((v) => v + 1);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [name]);

    const icon = resolvePikaicon(name);

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
