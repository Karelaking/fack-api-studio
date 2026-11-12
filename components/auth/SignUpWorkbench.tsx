"use client";

import * as React from "react";
import {
  CheckTickCircleIcon,
  CodeIcon,
  CopyIcon,
  TroubleshootIcon,
  File02Icon,
  LayerThreeIcon,
  LightningThunderElectricOnIcon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Visual canvas and schema pipeline workbench for new developers on the Sign-Up flow.
 * Allows toggling between the visual node pipeline and auto-generated TypeScript DTO output.
 */
export const SignUpWorkbench = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = React.useState<"canvas" | "typescript">(
    "canvas",
  );
  const [hasCopied, setHasCopied] = React.useState<boolean>(false);

  const sampleTypeScript = `export interface UserProfile {\n  id: string;\n  name: string;\n  role: "Lead Architect" | "Engineer";\n  active: boolean;\n}`;

  const handleCopyCode = (): void => {
    void navigator.clipboard.writeText(sampleTypeScript);
    setHasCopied(true);
    setTimeout((): void => setHasCopied(false), 2000);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value): void =>
        setActiveTab(value as "canvas" | "typescript")
      }
      className="border-border/80 bg-card/95 text-card-foreground ring-border/50 relative gap-0 overflow-hidden rounded-xl border shadow-lg ring-1 backdrop-blur-xs transition-all duration-300"
    >
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
          <TabsList className="bg-muted/70 ml-2 h-auto rounded-lg p-0.5">
            <TabsTrigger
              value="canvas"
              size="compact"
              className="text-mini h-auto rounded-md px-2 py-0.5 font-mono font-medium"
            >
              Visual Canvas
            </TabsTrigger>
            <TabsTrigger
              value="typescript"
              size="compact"
              className="text-mini h-auto rounded-md px-2 py-0.5 font-mono font-medium"
            >
              TypeScript DTO
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="border-primary/20 bg-primary/10 text-primary text-mini inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono font-semibold">
          <PikaIcon
            icon={LightningThunderElectricOnIcon}
            className="size-3"
            aria-hidden="true"
          />
          <span>Faker Synthesizer</span>
        </div>
      </div>

      {/* Tab 1: Visual Schema Pipeline */}
      <TabsContent value="canvas">
        <div className="space-y-2 p-3.5">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="flex items-center gap-2">
              <PikaIcon
                icon={LayerThreeIcon}
                className="text-primary size-3.5"
                aria-hidden="true"
              />
              <span className="text-foreground text-xs font-medium">
                Route: /api/v2/users
              </span>
            </div>
            <span className="text-muted-foreground text-mini font-mono">
              HTTP 200 · JSON
            </span>
          </div>

          <pre className="border-border/40 bg-muted/20 text-foreground/90 text-caption overflow-x-auto rounded-lg border p-2.5 font-mono leading-relaxed">
            <code>
              <span className="text-muted-foreground">{"{"}</span>
              <br />
              {"  "}
              <span className="text-primary">&quot;id&quot;</span>:{" "}
              <span className="text-warning">&quot;usr_9a4f21&quot;</span>
              ,
              <br />
              {"  "}
              <span className="text-primary">&quot;name&quot;</span>:{" "}
              <span className="text-warning">&quot;Ada Lovelace&quot;</span>
              ,
              <br />
              {"  "}
              <span className="text-primary">&quot;role&quot;</span>:{" "}
              <span className="text-warning">&quot;Lead Architect&quot;</span>
              ,
              <br />
              {"  "}
              <span className="text-primary">&quot;active&quot;</span>:{" "}
              <span className="text-info">true</span>
              <br />
              <span className="text-muted-foreground">{"}"}</span>
            </code>
          </pre>
        </div>
      </TabsContent>

      {/* Tab 2: TypeScript DTO Export */}
      <TabsContent value="typescript">
        <div className="text-caption p-3.5 font-mono leading-relaxed">
          <div className="border-border/50 bg-muted/20 relative rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-mini flex items-center gap-1.5">
                <PikaIcon icon={File02Icon} className="text-primary size-3" />
                types/user.dto.ts
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy TypeScript code"
              >
                {hasCopied ? (
                  <PikaIcon
                    icon={CheckTickCircleIcon}
                    className="text-success size-3.5"
                  />
                ) : (
                  <PikaIcon icon={CopyIcon} className="size-3.5" />
                )}
              </button>
            </div>
            <pre className="text-foreground/90 text-caption overflow-x-auto">
              <code>{sampleTypeScript}</code>
            </pre>
          </div>
        </div>
      </TabsContent>

      {/* Footer bar */}
      <div className="border-border/60 bg-muted/20 text-muted-foreground text-mini flex items-center justify-between border-t px-3.5 py-1.5 font-mono">
        <span className="flex items-center gap-1.5">
          <PikaIcon
            icon={TroubleshootIcon}
            className="text-primary size-3"
            aria-hidden="true"
          />
          TypeScript &amp; OpenAPI 3.1
        </span>
        <span className="flex items-center gap-1">
          <PikaIcon icon={CodeIcon} className="text-primary size-3" />
          Deterministic Seed 1337
        </span>
      </div>
    </Tabs>
  );
};
