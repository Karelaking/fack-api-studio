"use client";

// Inline SVG logo: `role="img"` + `aria-label` is the correct accessible
// pattern for inline vector art, which has no `<img src>` equivalent.
/* eslint-disable jsx-a11y/prefer-tag-over-role */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  variant?: "badge" | "glyph";
  className?: string;
}

/**
 * Fack API Official Brand Logo — "The Isometric Payload Stack"
 *
 * Represents layered mock schemas and API response payloads with an AI-synthesis star.
 * Supports both standalone glyph and framed sharp badge variants with high-precision vector paths.
 */
export function BrandLogo({
  size = 28,
  variant = "glyph",
  className,
  ...props
}: BrandLogoProps): React.JSX.Element {
  const id = React.useId();
  const bgGradId = `fack-bg-${id}`;
  const borderGradId = `fack-border-${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      aria-label="Fack API Logo"
      role="img"
      {...props}
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b0f19" />
          <stop offset="100%" stopColor="#06080d" />
        </linearGradient>

        <linearGradient id={borderGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
      </defs>

      {variant === "badge" && (
        <rect
          width="512"
          height="512"
          rx="112"
          fill={`url(#${bgGradId})`}
          stroke={`url(#${borderGradId})`}
          strokeWidth="4"
        />
      )}

      {/* Isometric Payload Stack Emblem */}
      <g
        transform={
          variant === "badge"
            ? "translate(114.9, 103) scale(0.72)"
            : "translate(60, 43.5)"
        }
      >
        <image
          href="/logo.png"
          width="392"
          height="425"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </svg>
  );
}
