"use client";

import * as React from "react";
import { RiDatabase2Line, RiCloseLine } from "@remixicon/react";
import { getGroupedProviders, type FakerCategory } from "@/lib/faker-registry";
import { ProviderChip } from "@/components/canvas/ProviderChip";
import {
  ProviderPaletteSearch,
  type CategoryTab,
} from "@/components/canvas/ProviderPaletteSearch";
import { useCanvasDndStore } from "@/stores/canvas-dnd-store-provider";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

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

interface SidebarProvidersSectionProps {
  selectedRoute: {
    id: string;
    path: string;
    method: string;
    mockUrl: string;
  } | null;
}

/**
 * Mock Data Providers section embedded directly inside the project's DashboardSidebar.
 *
 * Categorized, searchable, structured, and draggable directly onto canvas route cards.
 */
export function SidebarProvidersSection({
  selectedRoute,
}: SidebarProvidersSectionProps): React.JSX.Element {
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

  const effectiveRouteId = selectedRouteId ?? selectedRoute?.id ?? null;

  const handleKeyboardAdd = React.useCallback(
    async (providerValue: string) => {
      if (!effectiveRouteId) return;
      const { addFieldToRoute } = await import("@/lib/actions/canvas-dnd");
      try {
        const updated = await addFieldToRoute(effectiveRouteId, providerValue);
        window.dispatchEvent(
          new CustomEvent("canvas-field-added", {
            detail: {
              routeId: effectiveRouteId,
              providerValue,
              updatedRoute: updated,
            },
          }),
        );
      } catch {
        const { toast } = await import("sonner");
        toast.error("Failed to add field to route");
      }
    },
    [effectiveRouteId],
  );

  return (
    <SidebarGroup className="border-border/50 mt-2 border-t pt-3">
      <SidebarGroupLabel className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          <RiDatabase2Line
            className="text-primary size-3.5"
            aria-hidden="true"
          />
          <span className="text-foreground text-xs font-semibold">
            Mock Providers
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
          {totalVisible}
        </span>
      </SidebarGroupLabel>

      <SidebarGroupContent className="mt-2 space-y-2.5 px-2">
        {/* Context-aware target route indicator */}
        {selectedRoute ? (
          <div className="border-primary/25 bg-primary/8 flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
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
              aria-label="Deselect target route"
            >
              <RiCloseLine className="size-3" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground px-0.5 text-[11px] leading-tight">
            Drag a provider onto any route, or select a route and press
            Space/Enter.
          </p>
        )}

        {/* Real-time search and category tabs */}
        <ProviderPaletteSearch
          query={query}
          activeCategory={activeCategory}
          categories={categoryTabs}
          onQueryChange={handleQueryChange}
          onCategoryChange={setActiveCategory}
        />

        {/* Categorized provider chip list */}
        <div className="scrollbar-subtle max-h-96 space-y-3.5 overflow-y-auto pr-1">
          {visibleCategories.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">
              No providers match &ldquo;{query}&rdquo;
            </p>
          ) : (
            visibleCategories.map((category) => (
              <section key={category.name} aria-label={category.name}>
                <div className="mb-1 flex items-center justify-between px-1">
                  <h3 className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {category.name}
                  </h3>
                  <span className="text-muted-foreground/70 font-mono text-[9px]">
                    {category.providers.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {category.providers.map((provider) => (
                    <ProviderChip
                      key={provider.value}
                      provider={provider}
                      routeSelected={!!effectiveRouteId}
                      onKeyboardAdd={handleKeyboardAdd}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default SidebarProvidersSection;
