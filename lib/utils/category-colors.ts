/**
 * Fack API's — Dynamic Category Color System
 *
 * Implements a deterministic, O(1) hash-based category color allocator.
 * Maps any category or provider method path into a theme-adaptive, WCAG AA compliant
 * CSS design token defined in `app/globals.css`.
 *
 * Eliminates hardcoded category-to-color dictionaries so new categories added
 * to Faker or custom plugins automatically receive a visually distinct, accessible
 * hue without any manual code maintenance.
 */

import type { FakerProvider } from "@/lib/faker-registry";

/**
 * Curated palette of design system CSS custom properties from `app/globals.css`.
 * Spans the entire 360-degree OKLCH color wheel with verified WCAG AA contrast
 * in both light and dark modes.
 */
export const CATEGORY_COLOR_PALETTE: readonly string[] = [
  "var(--primary)", // Indigo (Hue 260)
  "var(--method-get)", // Emerald Green (Hue 152)
  "var(--info)", // Sky Blue (Hue 245)
  "var(--method-put)", // Amber (Hue 85)
  "var(--chart-4)", // Fuchsia (Hue 320)
  "var(--chart-3)", // Coral (Hue 45)
  "var(--chart-5)", // Teal (Hue 200)
  "var(--method-patch)", // Warm Orange (Hue 55)
  "var(--warning)", // Gold (Hue 85)
  "var(--chart-2)", // Sage Mint (Hue 152)
] as const;

export const DEFAULT_CATEGORY_COLOR = "var(--muted-foreground)";

/**
 * 32-bit Murmur3-inspired hash function providing high dispersion across buckets
 * for short ASCII strings (category names, method paths).
 */
function hashString(key: string): number {
  let h = 0;
  const str = key.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    let k = str.charCodeAt(i);
    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= str.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Extracts a normalized category identifier from a category name, dot-notated
 * provider method path (e.g. "airline.aircraftType" -> "airline"), or provider object.
 */
function extractCategoryKey(
  input?: string | Partial<FakerProvider> | null,
): string {
  if (!input) {
    return "";
  }

  if (typeof input === "object") {
    if (input.category && typeof input.category === "string") {
      return input.category.trim().toLowerCase();
    }
    if (input.value && typeof input.value === "string") {
      const prefix = input.value.split(".")[0];
      return (prefix || "").trim().toLowerCase();
    }
    return "";
  }

  const trimmed = input.trim().toLowerCase();
  // If it's a method path like "person.firstName", extract the root category "person"
  if (trimmed.includes(".")) {
    return trimmed.split(".")[0] || trimmed;
  }
  return trimmed;
}

/**
 * Deterministically resolves a theme-adaptive CSS color variable for any category
 * or provider path. Works for existing faker categories as well as future/custom ones.
 *
 * @param input - Category name, provider method path, or FakerProvider object
 * @returns CSS custom property string (e.g. `"var(--chart-4)"`)
 */
export function getCategoryColor(
  input?: string | Partial<FakerProvider> | null,
): string {
  const key = extractCategoryKey(input);
  if (!key) {
    return DEFAULT_CATEGORY_COLOR;
  }

  const hash = hashString(key);
  const index = hash % CATEGORY_COLOR_PALETTE.length;
  return CATEGORY_COLOR_PALETTE[index] ?? DEFAULT_CATEGORY_COLOR;
}

/**
 * Generates an OKLCH-based color-mix tint string for category backgrounds / pills.
 *
 * @param input - Category name, provider method path, or FakerProvider object
 * @param opacityPercent - Tint percentage (defaults to 12%)
 * @returns CSS color-mix expression string
 */
export function getCategoryTint(
  input?: string | Partial<FakerProvider> | null,
  opacityPercent: number = 12,
): string {
  const color = getCategoryColor(input);
  return `color-mix(in oklch, ${color} ${opacityPercent}%, transparent)`;
}
