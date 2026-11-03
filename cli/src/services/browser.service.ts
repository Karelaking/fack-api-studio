/**
 * Fack CLI — desktop integration.
 */

import { spawn } from "node:child_process";
import os from "node:os";

/** Human-readable platform used on the device-approval screen. */
export function detectPlatform(): string {
  const names: Record<string, string> = {
    win32: "Windows",
    darwin: "macOS",
    linux: "Linux",
    freebsd: "FreeBSD",
  };
  const name = names[process.platform] ?? process.platform;
  return `${name} ${process.arch}`;
}

export function detectDeviceName(): string {
  try {
    return os.hostname() || "Terminal";
  } catch {
    return "Terminal";
  }
}

/**
 * Opens the approval URL in the default browser. Failure is non-fatal: the
 * login command prints the URL so the developer can open it manually.
 */
export function openBrowser(url: string): boolean {
  let command: string;
  let args: string[];

  if (process.platform === "win32") {
    command = "cmd";
    // In Windows cmd.exe, unescaped & splits commands; escape with ^&
    const winUrl = url.replace(/&/g, "^&");
    args = ["/c", "start", "", winUrl];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
    });
    child.on("error", () => undefined);
    child.unref();
    return true;
  } catch {
    return false;
  }
}
