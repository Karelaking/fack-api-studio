"use client";

import * as React from "react";
import { RiSearchLine, RiCloseLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

/** Category tab definition. */
export interface CategoryTab {
  name: string;
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
 * Search bar + category tab strip for the Provider Palette left sidebar.
 * Keyboard shortcut: ⌘K or Ctrl+K focuses the search input.
 */
export const ProviderPaletteSearch = ({
  query,
  activeCategory,
  categories,
  onQueryChange,
  onCategoryChange,
}: ProviderPaletteSearchProps): React.JSX.Element => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: ⌘K / Ctrl+K focuses palette search
  React.useEffect(() => {
    const handleGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobal);
    return () => window.removeEventListener("keydown", handleGlobal);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <RiSearchLine
          className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search providers… ⌘K"
          className={cn(
            "bg-muted/50 border-border/60 text-foreground placeholder:text-muted-foreground",
            "h-8 w-full rounded-lg border py-1.5 pr-8 pl-8 text-xs outline-none",
            "focus:border-primary/50 focus:ring-primary/20 focus:ring-1 transition-colors",
          )}
          aria-label="Search providers"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 transition-colors"
            aria-label="Clear search"
          >
            <RiCloseLine className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Category tab strip */}
      <div
        role="tablist"
        aria-label="Provider categories"
        className="flex scrollbar-none gap-1 overflow-x-auto pb-0.5"
      >
        <button
          role="tab"
          type="button"
          aria-selected={activeCategory === ""}
          onClick={() => onCategoryChange("")}
          className={cn(
            "h-6 shrink-0 rounded-md px-2 text-[11px] font-semibold transition-colors",
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
            role="tab"
            type="button"
            aria-selected={activeCategory === cat.name}
            onClick={() => onCategoryChange(cat.name)}
            className={cn(
              "h-6 shrink-0 rounded-md px-2 text-[11px] font-semibold transition-colors",
              activeCategory === cat.name
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProviderPaletteSearch;
