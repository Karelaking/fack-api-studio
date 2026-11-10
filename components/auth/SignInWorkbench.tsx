"use client";

import * as React from "react";
import { Activity, Check, Copy, Lock, Terminal } from "lucide-react";

/**
 * Terminal and live traffic workbench for returning users on the Sign-In flow.
 * Allows toggling between real-time HTTP traffic stream and the local CLI terminal runner.
 */
export const SignInWorkbench = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = React.useState<"traffic" | "cli">(
    "traffic",
  );
  const [hasCopied, setHasCopied] = React.useState<boolean>(false);

  const handleCopyCommand = (): void => {
    void navigator.clipboard.writeText("fack dev --port 4000");
    setHasCopied(true);
    setTimeout((): void => setHasCopied(false), 2000);
  };

  return (
    <div className="border-border/80 bg-card/95 text-card-foreground ring-border/50 relative overflow-hidden rounded-xl border shadow-lg ring-1 backdrop-blur-xs transition-all duration-300">
      {/* Titlebar with window controls and interactive tab switcher */}
      <div className="border-border/70 bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="bg-danger/60 size-2.5 rounded-full"
          />
          <span
            aria-hidden="true"
            className="bg-warning/60 size-2.5 rounded-full"
          />
          <span
            aria-hidden="true"
            className="bg-success/60 size-2.5 rounded-full"
          />
          <div className="bg-muted/70 ml-2 inline-flex rounded-lg p-0.5">
            <button
              type="button"
              onClick={(): void => setActiveTab("traffic")}
              className={`text-mini rounded-md px-2 py-0.5 font-mono font-medium transition-all ${
                activeTab === "traffic"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Live Traffic
            </button>
            <button
              type="button"
              onClick={(): void => setActiveTab("cli")}
              className={`text-mini rounded-md px-2 py-0.5 font-mono font-medium transition-all ${
                activeTab === "cli"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              CLI Terminal
            </button>
          </div>
        </div>

        <div className="border-success/25 bg-success/10 text-mini text-success inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono font-semibold">
          <span className="relative flex size-1.5">
            <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
            <span className="bg-success relative inline-flex size-1.5 rounded-full" />
          </span>
          <span>12 Endpoints Active</span>
        </div>
      </div>

      {/* Tab 1: Live Traffic Log */}
      {activeTab === "traffic" && (
        <div className="text-caption space-y-2 p-3.5 font-mono leading-relaxed">
          <div className="border-border/40 bg-muted/20 hover:border-border/80 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors">
            <div className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground/60 text-mini">
                10:42:15
              </span>
              <span className="py-0.2 bg-method-get/15 text-mini text-method-get rounded px-1.5 font-bold">
                GET
              </span>
              <span className="text-foreground/90 truncate font-medium">
                /api/v1/projects
              </span>
            </div>
            <span className="text-muted-foreground text-mini shrink-0">
              200 OK · 14ms
            </span>
          </div>

          <div className="border-border/40 bg-muted/20 hover:border-border/80 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors">
            <div className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground/60 text-mini">
                10:42:19
              </span>
              <span className="py-0.2 bg-method-post/15 text-mini text-method-post rounded px-1.5 font-bold">
                POST
              </span>
              <span className="text-foreground/90 truncate font-medium">
                /api/cli/auth/device
              </span>
            </div>
            <span className="text-muted-foreground text-mini shrink-0">
              201 Created · 22ms
            </span>
          </div>

          <div className="border-border/40 bg-muted/20 hover:border-border/80 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors">
            <div className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground/60 text-mini">
                10:42:25
              </span>
              <span className="py-0.2 bg-method-get/15 text-mini text-method-get rounded px-1.5 font-bold">
                GET
              </span>
              <span className="text-foreground/90 truncate font-medium">
                /api/v1/endpoints/users
              </span>
            </div>
            <span className="text-muted-foreground text-mini shrink-0">
              200 OK · 8ms
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive CLI Terminal */}
      {activeTab === "cli" && (
        <div className="text-caption p-3.5 font-mono leading-relaxed">
          <div className="border-border/50 bg-muted/30 text-foreground/90 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="text-primary flex items-center gap-2">
                <Terminal className="size-3.5" aria-hidden="true" />
                <span className="font-semibold">$ fack dev --port 4000</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy terminal command"
              >
                {hasCopied ? (
                  <Check className="text-success size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            <p className="text-muted-foreground text-mini">
              Decrypted bundle with local secret key · AES-256-GCM
            </p>
            <div className="border-border/40 text-mini flex items-center justify-between border-t pt-1.5">
              <span className="text-success">
                ⚡ Serving mock endpoints on http://127.0.0.1:4000
              </span>
              <span className="text-muted-foreground">0ms cloud latency</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer bar */}
      <div className="border-border/60 bg-muted/20 text-muted-foreground text-mini flex items-center justify-between border-t px-3.5 py-1.5 font-mono">
        <span className="flex items-center gap-1.5">
          <Lock className="text-primary size-3" aria-hidden="true" />
          fack.enc · AES-256-GCM
        </span>
        <span className="flex items-center gap-1">
          <Activity className="text-success size-3" />
          SQLite WAL Mode
        </span>
      </div>
    </div>
  );
};
