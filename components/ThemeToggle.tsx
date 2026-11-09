"use client";

import * as React from "react";
import { RiMoonLine, RiSunLine } from "@remixicon/react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

const emptySubscribe = (): (() => void) => () => {};

function useMounted(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function useShortcutLabel(): string {
  return React.useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof navigator !== "undefined" &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent)
        ? "⌘⇧D"
        : "Ctrl+Shift+D",
    () => "Ctrl+Shift+D",
  );
}

/**
 * Interactive Light Bulb Theme Toggle.
 *
 * Click: Toggles between Light and Dark mode with an authored circular
 * View Transition expanding or contracting across the entire viewport.
 * Keyboard: Ctrl+Shift+D (⌘⇧D on macOS).
 */
export const ThemeToggle = ({
  className,
}: ThemeToggleProps): React.JSX.Element => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useMounted();
  const shortcut = useShortcutLabel();
  const [isSparking, setIsSparking] = React.useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    setIsSparking(true);
    window.setTimeout(() => setIsSparking(false), 400);
    toggleTheme(e);
  };

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const accessibleLabel = isDark
    ? `Switch to light mode (${shortcut})`
    : `Switch to dark mode (${shortcut})`;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      data-theme-toggle="true"
      onClick={handleClick}
      aria-label={accessibleLabel}
      aria-pressed={isDark}
      className={cn(
        "relative h-9 w-9 overflow-hidden rounded-md border-border/60 transition-transform duration-150 active:scale-90 motion-reduce:transition-none pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        className,
      )}
    >
      {/* Filament Spark Pulse on Click */}
      {isSparking ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 animate-ping rounded-full opacity-75 motion-reduce:hidden",
            isDark ? "bg-warning/40" : "bg-primary/30",
          )}
        />
      ) : null}

      {/* Sun Icon (Light Mode Filament) */}
      <RiSunLine
        className={cn(
          "h-[1.15rem] w-[1.15rem] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          isDark
            ? "scale-0 rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100 text-warning",
        )}
      />

      {/* Moon Icon (Dark Mode Filament) */}
      <RiMoonLine
        className={cn(
          "absolute h-[1.15rem] w-[1.15rem] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          isDark
            ? "scale-100 rotate-0 opacity-100 text-primary"
            : "scale-0 -rotate-90 opacity-0",
        )}
      />

      <span className="sr-only">{accessibleLabel}</span>
    </Button>
  );
};
