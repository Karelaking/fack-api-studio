"use client";

import * as React from "react";
import { SearchIcon, MultipleCrossCancelIcon } from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { cn } from "@/lib/utils";

/** Category tab definition. */
export interface CategoryTab {
  name: string;
  fullName?: string;
  count: number;
}

interface ProviderPaletteSearchProps {
  /** Current search query value. */
  query: string;
  /** Active category tab (empty string = "All"). */
  activeCategory: string;
  /** Available category tabs derived from providers. */
  categories: CategoryTab[];
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
}

/**
 * Search bar + category filter strip for the Provider Palette left sidebar.
 * Keyboard shortcut: "/" (slash) focuses the search input when no input is active.
 */
export const ProviderPaletteSearch = ({
  query,
  activeCategory,
  categories,
  onQueryChange,
  onCategoryChange,
}: ProviderPaletteSearchProps): React.JSX.Element => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll, categories]);

  // Global keyboard shortcut: "/" focuses palette search (avoid Cmd+K collision with Command Menu)
  React.useEffect(() => {
    const handleGlobal = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleGlobal);
    return () => window.removeEventListener("keydown", handleGlobal);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <PikaIcon
          icon={SearchIcon}
          size={14}
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search providers…  /"
          className={cn(
            "bg-muted/50 border-border/60 text-foreground placeholder:text-muted-foreground",
            "h-9 w-full rounded-lg border py-1.5 pr-8 pl-8 text-xs outline-none",
            "focus:border-primary/50 focus:ring-primary/20 focus:ring-1 transition-colors",
          )}
          aria-label="Search providers"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 p-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
            aria-label="Clear search"
          >
            <PikaIcon
              icon={MultipleCrossCancelIcon}
              size={14}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* Category filter strip with edge fade indicators */}
      <div className="relative">
        {canScrollLeft && (
          <div
            aria-hidden="true"
            className="from-sidebar pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r to-transparent"
          />
        )}
        <div
          ref={scrollContainerRef}
          role="toolbar"
          aria-label="Filter by category"
          tabIndex={-1}
          onScroll={checkScroll}
          className="flex scrollbar-none gap-1 overflow-x-auto scroll-smooth pb-0.5"
          onKeyDown={(e) => {
            const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>(
              "[data-category-filter]",
            );
            const arr = Array.from(buttons);
            const idx = arr.indexOf(e.target as HTMLButtonElement);
            if (idx === -1) return;
            let next = -1;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              next = (idx + 1) % arr.length;
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              next = (idx - 1 + arr.length) % arr.length;
            } else if (e.key === "Home") {
              next = 0;
            } else if (e.key === "End") {
              next = arr.length - 1;
            }
            if (next !== -1) {
              e.preventDefault();
              arr[next].focus();
            }
          }}
        >
          <button
            data-category-filter
            type="button"
            title="All categories"
            aria-label="All categories"
            aria-pressed={activeCategory === ""}
            tabIndex={activeCategory === "" ? 0 : -1}
            onClick={() => onCategoryChange("")}
            className={cn(
              "h-7 shrink-0 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              activeCategory === ""
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              data-category-filter
              type="button"
              title={cat.fullName ? `${cat.fullName} (${cat.count})` : cat.name}
              aria-label={
                cat.fullName
                  ? `${cat.fullName} category, ${cat.count} providers`
                  : `${cat.name} category`
              }
              aria-pressed={activeCategory === cat.name}
              tabIndex={activeCategory === cat.name ? 0 : -1}
              onClick={() => onCategoryChange(cat.name)}
              className={cn(
                "h-7 shrink-0 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {canScrollRight && (
          <div
            aria-hidden="true"
            className="from-sidebar pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l to-transparent"
          />
        )}
      </div>
    </div>
  );
};

export default ProviderPaletteSearch;
