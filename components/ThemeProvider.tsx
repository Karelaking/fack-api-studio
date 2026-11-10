"use client";

import * as React from "react";
import { ThemeHotkeyListener } from "./ThemeHotkeyListener";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type ThemeTransitionOrigin =
  | React.MouseEvent
  | MouseEvent
  | { clientX: number; clientY: number }
  | HTMLElement
  | null
  | undefined;

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme, origin?: ThemeTransitionOrigin) => void;
  toggleTheme: (origin?: ThemeTransitionOrigin) => void;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Resolves the origin coordinates for the light-bulb circular view transition.
 * Prioritizes direct pointer coordinates, falls back to the on-screen toggle button,
 * and defaults to the viewport center.
 */
function getOriginCoordinates(origin?: ThemeTransitionOrigin): {
  x: number;
  y: number;
} {
  if (origin) {
    if ("clientX" in origin && typeof origin.clientX === "number") {
      return { x: origin.clientX, y: origin.clientY };
    }
    if (
      "getBoundingClientRect" in origin &&
      typeof origin.getBoundingClientRect === "function"
    ) {
      const rect = origin.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }

  // Fallback: search for [data-theme-toggle] in the active DOM
  if (typeof document !== "undefined") {
    const toggleEl = document.querySelector<HTMLElement>("[data-theme-toggle]");
    if (toggleEl) {
      const rect = toggleEl.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }

  // Final fallback: center of viewport
  if (typeof window !== "undefined") {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }

  return { x: 0, y: 0 };
}

/**
 * Applies the resolved theme, optionally suppressing CSS transitions so the
 * swap does not animate (e.g. background-color easing on theme toggle).
 */
function applyThemeWithTransitionGuard(
  theme: ResolvedTheme,
  disableTransition: boolean,
): void {
  if (!disableTransition) {
    applyThemeClass(theme);
    return;
  }

  const style = document.createElement("style");
  style.appendChild(document.createTextNode("*{transition:none!important}"));
  document.head.appendChild(style);

  applyThemeClass(theme);

  // Force a reflow so the browser commits the new styles before transitions
  // are re-enabled on the next tick.
  void document.body.offsetHeight;
  window.setTimeout(() => style.remove(), 0);
}

function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export const ThemeProvider = ({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  storageKey = "theme",
  disableTransitionOnChange = false,
}: ThemeProviderProps): React.JSX.Element => {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    const savedTheme = localStorage.getItem(storageKey);
    return isTheme(savedTheme) ? savedTheme : defaultTheme;
  });
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return getSystemTheme();
  });
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (enableSystem ? systemTheme : "light") : theme;

  const activeTransitionRef = React.useRef<ViewTransition | null>(null);
  const isTransitioningRef = React.useRef(false);

  const setThemeWithTransition = React.useCallback(
    async (nextTheme: Theme, origin?: ThemeTransitionOrigin): Promise<void> => {
      const targetResolvedTheme: ResolvedTheme =
        nextTheme === "system"
          ? enableSystem
            ? getSystemTheme()
            : "light"
          : nextTheme;

      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Ignore quota/private browsing storage errors
      }

      // If the visual theme doesn't change, simply record the state
      if (targetResolvedTheme === resolvedTheme) {
        setThemeState(nextTheme);
        return;
      }

      const isReducedMotion =
        typeof window !== "undefined"
          ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
          : false;

      // When View Transitions API is not available or reduced motion is preferred, swap immediately
      if (
        typeof document === "undefined" ||
        !("startViewTransition" in document) ||
        isReducedMotion
      ) {
        if (attribute === "class") {
          applyThemeWithTransitionGuard(
            targetResolvedTheme,
            disableTransitionOnChange,
          );
        }
        setThemeState(nextTheme);
        return;
      }

      // Skip previous in-flight transition to prevent stutter on rapid clicks
      if (activeTransitionRef.current) {
        try {
          activeTransitionRef.current.skipTransition();
        } catch {
          // Ignore
        }
      }

      const { x, y } = getOriginCoordinates(origin);
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const isGoingToDark = targetResolvedTheme === "dark";

      isTransitioningRef.current = true;
      document.documentElement.classList.add("theme-transitioning");

      try {
        const transition = document.startViewTransition(() => {
          applyThemeClass(targetResolvedTheme);
          setThemeState(nextTheme);
        });

        activeTransitionRef.current = transition;

        await transition.ready;

        // The Light view is always the authored element that expands or contracts:
        // - Dark -> Light (Bulb Turning ON): New view (light) expands from 0 to endRadius
        // - Light -> Dark (Bulb Turning OFF): Old view (light) contracts from endRadius to 0
        const keyframes = isGoingToDark
          ? [
              `circle(${endRadius}px at ${x}px ${y}px)`,
              `circle(0px at ${x}px ${y}px)`,
            ]
          : [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

        const pseudoElement = isGoingToDark
          ? "::view-transition-old(root)"
          : "::view-transition-new(root)";

        const anim = document.documentElement.animate(
          {
            clipPath: keyframes,
          },
          {
            duration: 480,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "forwards",
            pseudoElement,
          } as KeyframeAnimationOptions,
        );

        await anim.finished;
        try {
          await transition.finished;
        } catch {
          // Ignore if transition was skipped or aborted
        }
      } catch {
        applyThemeClass(targetResolvedTheme);
        setThemeState(nextTheme);
      } finally {
        isTransitioningRef.current = false;
        activeTransitionRef.current = null;
        document.documentElement.classList.remove("theme-transitioning");
      }
    },
    [
      attribute,
      disableTransitionOnChange,
      enableSystem,
      resolvedTheme,
      storageKey,
    ],
  );

  const toggleTheme = React.useCallback(
    (origin?: ThemeTransitionOrigin): void => {
      const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
      void setThemeWithTransition(nextTheme, origin);
    },
    [resolvedTheme, setThemeWithTransition],
  );

  React.useEffect(() => {
    if (attribute === "class" && !isTransitioningRef.current) {
      applyThemeWithTransitionGuard(resolvedTheme, disableTransitionOnChange);
    }
  }, [attribute, disableTransitionOnChange, resolvedTheme]);

  React.useEffect(() => {
    if (!enableSystem || theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (): void => {
      const nextResolvedTheme = getSystemTheme();
      setSystemTheme(nextResolvedTheme);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [enableSystem, theme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (newTheme: Theme, origin?: ThemeTransitionOrigin) => {
        void setThemeWithTransition(newTheme, origin);
      },
      toggleTheme,
    }),
    [resolvedTheme, setThemeWithTransition, theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeHotkeyListener />
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
