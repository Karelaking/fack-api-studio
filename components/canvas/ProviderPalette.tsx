"use client";

import * as React from "react";
import { RiDatabase2Line, RiCloseLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { getGroupedProviders, type FakerCategory } from "@/lib/faker-registry";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProviderChip } from "./ProviderChip";
import {
  ProviderPaletteSearch,
  type CategoryTab,
} from "./ProviderPaletteSearch";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import type { Route } from "@/db/schema";

/** Derives a stable short label for a category tab. */
function shortCategoryLabel(name: string): string {
  const short: Record<string, string> = {
    Person: "Person",
    Internet: "Net",
    Finance: "Finance",
    Location: "Geo",
    Date: "Date",
    Commerce: "Shop",
    Company: "Biz",
    System: "Sys",
    Database: "DB",
    Vehicle: "Auto",
    Animal: "Animal",
    Music: "Music",
    Science: "Sci",
    Food: "Food",
    Sport: "Sport",
    Airline: "Air",
    Hacker: "Hacker",
    Lorem: "Lorem",
    Word: "Word",
    Color: "Color",
    Git: "Git",
    Image: "Image",
    Phone: "Phone",
    String: "String",
    Number: "Num",
    Datatype: "Bool",
  };
  return short[name] ?? name;
}

interface ProviderPaletteProps {
  /** Active routes in this project (used for context-aware header). */
  routes: Route[];
}

/**
 * Left sidebar palette listing every Faker.js provider as draggable chips.
 *
 * Layout rules (craft-floor):
 * - Full-height panel; never clips content on small screens — uses ScrollArea.
 * - Two-level hierarchy: category tabs strip -> chip grid within each group.
 * - Context header updates when a route is selected to anchor the user's intent.
 * - Search filters across all categories instantly.
 * - Keyboard shortcut ⌘K focuses search; Space/Enter on a chip (when route
 *   selected) adds the field without requiring a drag.
 */
export const ProviderPalette = ({
  routes,
}: ProviderPaletteProps): React.JSX.Element => {
  const selectedRouteId = useCanvasDndStore((s) => s.selectedRouteId);
  const setSelectedRoute = useCanvasDndStore((s) => s.setSelectedRoute);

  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("");

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (q) {
      setActiveCategory("");
    }
  };

  const allCategories: FakerCategory[] = React.useMemo(
    () => getGroupedProviders(),
    [],
  );

  const categoryTabs: CategoryTab[] = React.useMemo(
    () =>
      allCategories.map((cat) => ({
        name: shortCategoryLabel(cat.name),
        fullName: cat.name,
        count: cat.providers.length,
      })) as CategoryTab[],
    [allCategories],
  );

  // The filtered list of categories + providers based on query and active category
  const visibleCategories = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return allCategories
      .map((cat) => {
        const matchesCategory =
          !activeCategory || shortCategoryLabel(cat.name) === activeCategory;
        const filtered = cat.providers.filter((p) => {
          if (!matchesCategory) return false;
          if (!q) return true;
          return (
            p.label.toLowerCase().includes(q) ||
            p.value.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        });
        return { ...cat, providers: filtered };
      })
      .filter((cat) => cat.providers.length > 0);
  }, [allCategories, query, activeCategory]);

  const totalVisible = visibleCategories.reduce(
    (acc, cat) => acc + cat.providers.length,
    0,
  );

  const selectedRoute = React.useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  // Keyboard-add: called when user presses Space/Enter on a chip with a route selected
  const handleKeyboardAdd = React.useCallback(
    async (providerValue: string) => {
      if (!selectedRouteId) return;
      const { addFieldToRoute } = await import("@/lib/actions/canvas-dnd");
      try {
        await addFieldToRoute(selectedRouteId, providerValue);
        // Trigger a soft router refresh to sync RouteNode field badges
        window.dispatchEvent(
          new CustomEvent("canvas-field-added", {
            detail: { routeId: selectedRouteId, providerValue },
          }),
        );
      } catch {
        const { toast } = await import("sonner");
        toast.error("Failed to add field");
      }
    },
    [selectedRouteId],
  );

  return (
    <aside
      className={cn(
        "bg-background border-border/60 flex h-full w-64 shrink-0 flex-col border-r",
      )}
      aria-label="Provider palette"
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="border-border/60 shrink-0 space-y-3 border-b px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiDatabase2Line
              className="text-primary h-3.5 w-3.5"
              aria-hidden="true"
            />
            <span className="text-foreground text-xs font-semibold">
              Providers
            </span>
          </div>
          <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
            {totalVisible}
          </span>
        </div>

        {/* Context-aware target indicator */}
        {selectedRoute ? (
          <div className="bg-primary/8 border-primary/20 flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
                style={{
                  color: `var(--method-${selectedRoute.method.toLowerCase()})`,
                  backgroundColor: `color-mix(in oklch, var(--method-${selectedRoute.method.toLowerCase()}) 12%, transparent)`,
                }}
              >
                {selectedRoute.method}
              </span>
              <span className="text-primary truncate font-mono text-[10px] font-medium">
                {selectedRoute.path}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRoute(null)}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              aria-label="Deselect route"
            >
              <RiCloseLine className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground text-[11px] leading-snug">
            Select a route on the canvas, then drag a provider onto it.
          </p>
        )}

        <ProviderPaletteSearch
          query={query}
          activeCategory={activeCategory}
          categories={categoryTabs}
          onQueryChange={handleQueryChange}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {/* ── Provider list ─────────────────────────────────────────── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-2 py-3">
          {visibleCategories.length === 0 ? (
            <p className="text-muted-foreground px-1 text-center text-xs leading-relaxed">
              No providers match <strong>&ldquo;{query}&rdquo;</strong>
            </p>
          ) : (
            visibleCategories.map((category) => (
              <section key={category.name} aria-label={category.name}>
                <h3 className="text-muted-foreground mb-1.5 px-1 text-[10px] font-bold tracking-wider uppercase">
                  {category.name}
                </h3>
                <div className="grid grid-cols-1 gap-1">
                  {category.providers.map((provider) => (
                    <ProviderChip
                      key={provider.value}
                      provider={provider}
                      routeSelected={!!selectedRouteId}
                      onKeyboardAdd={handleKeyboardAdd}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default ProviderPalette;
