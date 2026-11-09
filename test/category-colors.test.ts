import { describe, it, expect } from "vite-plus/test";
import {
  getCategoryColor,
  getCategoryTint,
  CATEGORY_COLOR_PALETTE,
  DEFAULT_CATEGORY_COLOR,
} from "@/lib/utils/category-colors";
import { staticProviderDefinitions } from "@/lib/faker-providers-data";

describe("Dynamic Category Color System", () => {
  describe("Determinism and Normalization", () => {
    it("returns the exact same color for identical category inputs", () => {
      const colorA = getCategoryColor("Airline");
      const colorB = getCategoryColor("Airline");
      expect(colorA).toBe(colorB);
      expect(CATEGORY_COLOR_PALETTE).toContain(colorA);
    });

    it("is case-insensitive and trims whitespace", () => {
      const expected = getCategoryColor("finance");
      expect(getCategoryColor("Finance")).toBe(expected);
      expect(getCategoryColor("FINANCE")).toBe(expected);
      expect(getCategoryColor("  finance  ")).toBe(expected);
    });

    it("extracts root category from dot-notated method paths", () => {
      const categoryColor = getCategoryColor("person");
      const pathColor = getCategoryColor("person.firstName");
      const deepPathColor = getCategoryColor("person.fullName.prefix");

      expect(pathColor).toBe(categoryColor);
      expect(deepPathColor).toBe(categoryColor);
    });

    it("accepts provider objects with category or value", () => {
      const expected = getCategoryColor("airline");
      expect(getCategoryColor({ category: "Airline" })).toBe(expected);
      expect(getCategoryColor({ value: "airline.aircraftType" })).toBe(
        expected,
      );
      expect(
        getCategoryColor({
          category: "Airline",
          value: "airline.aircraftType",
        }),
      ).toBe(expected);
    });
  });

  describe("Edge Cases and Graceful Fallbacks", () => {
    it("returns DEFAULT_CATEGORY_COLOR for missing or empty inputs", () => {
      expect(getCategoryColor(undefined)).toBe(DEFAULT_CATEGORY_COLOR);
      expect(getCategoryColor(null)).toBe(DEFAULT_CATEGORY_COLOR);
      expect(getCategoryColor("")).toBe(DEFAULT_CATEGORY_COLOR);
      expect(getCategoryColor("   ")).toBe(DEFAULT_CATEGORY_COLOR);
      expect(getCategoryColor({})).toBe(DEFAULT_CATEGORY_COLOR);
    });
  });

  describe("Future Scalability (No Hardcoding Required)", () => {
    it("dynamically resolves colors for novel, unregistered categories", () => {
      const novelCategories = [
        "crypto",
        "quantum",
        "telemetry",
        "blockchain",
        "healthcare",
        "iot",
        "gaming",
        "logistics",
        "space",
      ];

      for (const category of novelCategories) {
        const color = getCategoryColor(category);
        expect(CATEGORY_COLOR_PALETTE).toContain(color);
        expect(color).toMatch(/^var\(--[\w-]+\)$/);
      }
    });
  });

  describe("Design System Continuity Across All Faker Providers", () => {
    it("maps all static faker categories to valid palette tokens", () => {
      const uniqueCategories = Array.from(
        new Set(staticProviderDefinitions.map((p) => p.category)),
      );

      expect(uniqueCategories.length).toBeGreaterThanOrEqual(20);

      const assignedColors = new Set<string>();

      for (const cat of uniqueCategories) {
        const color = getCategoryColor(cat);
        expect(CATEGORY_COLOR_PALETTE).toContain(color);
        assignedColors.add(color);
      }

      // Ensures good dispersion across palette buckets
      expect(assignedColors.size).toBeGreaterThanOrEqual(6);
    });
  });

  describe("getCategoryTint", () => {
    it("formats an OKLCH color-mix expression with default 12% opacity", () => {
      const tint = getCategoryTint("person");
      const color = getCategoryColor("person");
      expect(tint).toBe(`color-mix(in oklch, ${color} 12%, transparent)`);
    });

    it("formats an OKLCH color-mix expression with custom opacity percentage", () => {
      const tint = getCategoryTint("finance", 25);
      const color = getCategoryColor("finance");
      expect(tint).toBe(`color-mix(in oklch, ${color} 25%, transparent)`);
    });
  });
});
