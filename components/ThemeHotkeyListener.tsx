"use client";

import * as React from "react";
import { useTheme } from "./ThemeProvider";

/**
 * Global keyboard shortcut listener that binds Ctrl+Shift+D or Cmd+Shift+D
 * to toggle between light and dark themes across the application.
 */
export const ThemeHotkeyListener = (): React.JSX.Element | null => {
  const { toggleTheme } = useTheme();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Requires Ctrl+Shift+D or Cmd+Shift+D to toggle theme (preventing accidental single 'd' keystroke)
      if (
        e.key.toLowerCase() === "d" &&
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey
      ) {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme]);

  return null;
};
