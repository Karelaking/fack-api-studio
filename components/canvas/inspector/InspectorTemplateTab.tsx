"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  PlayCircleIcon,
  RefreshIcon,
  CopyIcon,
  CheckTickCircleIcon,
  AlertCircleIcon,
  Settings01Icon,
} from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import {
  validateTemplate,
  renderTemplate,
  buildTemplateContext,
} from "@/lib/template-engine";
import type { InspectorTab } from "./inspector.types";

export interface InspectorTemplateTabProps {
  template: string;
  setTemplate: (val: string) => void;
  method: string;
  path: string;
  statusCode: number;
  detectedParams: { name: string }[];
  onSelectTab: (tab: InspectorTab) => void;
}

type EditorSubMode = "template" | "preview";

interface SnippetPreset {
  name: string;
  description: string;
  content: string;
}

const SNIPPET_PRESETS: SnippetPreset[] = [
  {
    name: "API Envelope",
    description: "Standard JSON envelope with status, data, and timestamp",
    content: JSON.stringify(
      {
        success: true,
        statusCode: 200,
        data: {
          id: "{{uuid}}",
          name: "{{faker.person.fullName}}",
          email: "{{faker.internet.email}}",
          avatar: "{{faker.image.avatar}}",
        },
        meta: {
          timestamp: "{{now}}",
          version: "v1",
        },
      },
      null,
      2,
    ),
  },
  {
    name: "Conditional Role",
    description: "Dynamic payload toggled by query parameter or request body",
    content: JSON.stringify(
      {
        userId: "{{request.params.id}}",
        role: "{{#if (eq request.query.role 'admin')}}ADMINISTRATOR{{else}}STANDARD_USER{{/if}}",
        accessLevel:
          "{{#if (eq request.query.role 'admin')}}full{{else}}restricted{{/if}}",
        generatedAt: "{{now}}",
      },
      null,
      2,
    ),
  },
  {
    name: "Stateful Lookup",
    description: "Read-only mock state access with count and item lookup",
    content: JSON.stringify(
      {
        requestedId: "{{request.params.id}}",
        user: "{{lookup 'users' request.params.id}}",
        totalUsers: "{{count 'users'}}",
      },
      null,
      2,
    ),
  },
  {
    name: "Echo Request",
    description: "Echoes body, headers, and query parameters dynamically",
    content: JSON.stringify(
      {
        method: "{{request.method}}",
        path: "{{request.path}}",
        echoedBody: "{{request.body}}",
        page: "{{default request.query.page '1'}}",
      },
      null,
      2,
    ),
  },
];

const VARIABLE_CHIPS = [
  { label: "uuid", code: "{{uuid}}", category: "runtime" },
  { label: "now", code: "{{now}}", category: "runtime" },
  { label: "timestamp", code: "{{timestamp}}", category: "runtime" },
  { label: "increment", code: "{{increment}}", category: "runtime" },
  { label: "faker.name", code: "{{faker.person.fullName}}", category: "faker" },
  { label: "faker.email", code: "{{faker.internet.email}}", category: "faker" },
  { label: "faker.uuid", code: "{{faker.string.uuid}}", category: "faker" },
  { label: "faker.city", code: "{{faker.location.city}}", category: "faker" },
  { label: "request.body", code: "{{request.body.name}}", category: "request" },
  {
    label: "request.param",
    code: "{{request.params.id}}",
    category: "request",
  },
  {
    label: "request.query",
    code: "{{request.query.page}}",
    category: "request",
  },
  {
    label: "uppercase",
    code: "{{uppercase request.body.name}}",
    category: "helper",
  },
  {
    label: "lowercase",
    code: "{{lowercase request.body.role}}",
    category: "helper",
  },
  {
    label: "concat",
    code: '{{concat request.body.first " " request.body.last}}',
    category: "helper",
  },
  {
    label: "default",
    code: '{{default request.body.status "active"}}',
    category: "helper",
  },
  {
    label: "if eq",
    code: '{{#if (eq request.query.role "admin")}}...{{else}}...{{/if}}',
    category: "helper",
  },
  {
    label: "lookup",
    code: '{{lookup "users" request.params.id}}',
    category: "state",
  },
  { label: "count", code: '{{count "users"}}', category: "state" },
];

export const InspectorTemplateTab = ({
  template,
  setTemplate,
  method,
  path,
  statusCode,
  detectedParams,
  onSelectTab,
}: InspectorTemplateTabProps): React.JSX.Element => {
  const [subMode, setSubMode] = React.useState<EditorSubMode>("template");
  const [copied, setCopied] = React.useState(false);

  // Live preview test context
  const [sampleSeed, setSampleSeed] = React.useState<number>(42);
  const [sampleBody, setSampleBody] = React.useState<string>(
    JSON.stringify(
      { name: "Alex Rivers", role: "developer", age: 28 },
      null,
      2,
    ),
  );
  const [sampleQuery, setSampleQuery] = React.useState<string>(
    JSON.stringify({ role: "admin", page: "1" }, null, 2),
  );
  const [sampleParams] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of detectedParams) {
      initial[p.name] = p.name === "id" ? "usr_42" : `sample_${p.name}`;
    }
    return initial;
  });

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Validation
  const validation = React.useMemo(() => {
    return validateTemplate(template);
  }, [template]);

  const insertVariable = (code: string): void => {
    const el = textareaRef.current;
    if (!el) {
      setTemplate(template + code);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextVal =
      template.substring(0, start) + code + template.substring(end);
    setTemplate(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + code.length, start + code.length);
    }, 10);
  };

  const handleFormatJson = (): void => {
    try {
      const parsed = JSON.parse(template);
      setTemplate(JSON.stringify(parsed, null, 2));
      toast.success("Template JSON formatted");
    } catch {
      toast.error("Template is not valid JSON to format automatically");
    }
  };

  // Preview evaluation
  const previewResult = React.useMemo(() => {
    if (!template || template.trim() === "") {
      return { output: "/* No template defined */", isError: false };
    }

    if (!validation.isValid) {
      return {
        output: `Validation Error: ${validation.errors.map((e) => e.message).join("\n")}`,
        isError: true,
      };
    }

    try {
      let parsedBody: unknown = {};
      try {
        parsedBody = JSON.parse(sampleBody);
      } catch {}

      let parsedQuery: Record<string, unknown> = {};
      try {
        parsedQuery = JSON.parse(sampleQuery);
      } catch {}

      const context = buildTemplateContext({
        request: {
          method,
          path,
          body: parsedBody,
          query: parsedQuery,
          params: sampleParams,
          headers: {
            accept: "application/json",
            "x-preview-mode": "true",
          },
        },
        state: {
          collections: {
            users: [
              { id: "usr_42", name: "Alex Rivers", role: "admin" },
              { id: "usr_99", name: "Sam Jordan", role: "viewer" },
            ],
          },
        },
      });

      const evaluated = renderTemplate(template, {
        context,
        seed: sampleSeed,
      });

      return {
        output:
          typeof evaluated === "string"
            ? evaluated
            : JSON.stringify(evaluated, null, 2),
        isError: false,
      };
    } catch (err: unknown) {
      return {
        output: err instanceof Error ? err.message : String(err),
        isError: true,
      };
    }
  }, [
    template,
    validation,
    sampleBody,
    sampleQuery,
    sampleParams,
    sampleSeed,
    method,
    path,
  ]);

  const handleCopyPreview = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(previewResult.output);
      setCopied(true);
      toast.success("Preview output copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <TabsContent
      value="template"
      className="scrollbar-subtle m-0 min-h-0 flex-1 overflow-y-auto"
    >
      <div className="flex h-full flex-col space-y-4 p-4">
        {/* Mode Switcher & Status Bar */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-muted flex items-center rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setSubMode("template")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  subMode === "template"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Template Mode
              </button>
              <button
                type="button"
                onClick={() => setSubMode("preview")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  subMode === "preview"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PikaIcon icon={PlayCircleIcon} className="size-3" />
                Live Preview
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab("schema")}
              className="text-muted-foreground hover:text-foreground h-7 gap-1 text-xs"
              title="Switch back to Visual Schema Mode"
            >
              <PikaIcon icon={Settings01Icon} className="size-3" />
              Switch to Schema
            </Button>
          </div>

          {template.trim().length > 0 ? (
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 font-mono text-xs"
            >
              Template Active
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-muted-foreground font-mono text-xs"
            >
              Schema Active
            </Badge>
          )}
        </div>

        {subMode === "template" ? (
          <div className="flex min-h-0 flex-1 flex-col space-y-3">
            {/* Quick presets & action bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                  Snippets:
                </span>
                {SNIPPET_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setTemplate(preset.content);
                      toast.success(`Loaded "${preset.name}" preset`);
                    }}
                    className="bg-muted/70 hover:bg-muted text-foreground border-border/50 rounded border px-2 py-0.5 text-xs transition-colors"
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFormatJson}
                  className="h-7 text-xs"
                >
                  Format JSON
                </Button>
                {template.trim().length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTemplate("");
                      toast.info(
                        "Cleared template. Route will use schema generation.",
                      );
                    }}
                    className="text-destructive hover:bg-destructive/10 h-7 text-xs"
                  >
                    Clear Template
                  </Button>
                )}
              </div>
            </div>

            {/* Variable chips palette */}
            <div className="bg-muted/40 border-border/60 space-y-1.5 rounded-lg border p-2">
              <div className="text-muted-foreground text-caption font-semibold tracking-wider uppercase">
                Quick Insert Palette
              </div>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {VARIABLE_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => insertVariable(chip.code)}
                    className="bg-background hover:bg-accent text-foreground border-border/40 hover:border-primary/40 text-caption rounded border px-1.5 py-0.5 font-mono transition-colors"
                    title={`Insert ${chip.code}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Feedback */}
            {!validation.isValid && validation.errors.length > 0 ? (
              <div className="bg-destructive/10 border-destructive/30 text-destructive space-y-1 rounded-lg border p-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold">
                  <PikaIcon
                    icon={AlertCircleIcon}
                    className="size-4 shrink-0"
                  />
                  Syntax Error
                </div>
                {validation.errors.map((err, i) => (
                  <div key={i} className="text-caption pl-5 font-mono">
                    {err.line ? `Line ${err.line}, Col ${err.column}: ` : ""}
                    {err.message}
                  </div>
                ))}
              </div>
            ) : template.trim().length > 0 ? (
              <div className="text-success bg-success/10 border-success/30 flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium">
                <PikaIcon icon={CheckTickCircleIcon} className="size-3.5" />
                Template syntax is valid
              </div>
            ) : null}

            {/* Code Editor Area */}
            <div className="flex min-h-70 flex-1 flex-col">
              <Textarea
                ref={textareaRef}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder='Write your response template here, e.g.:&#10;{&#10;  "id": "{{request.params.id}}",&#10;  "name": "{{faker.person.fullName}}",&#10;  "status": "{{default request.body.status \"active\"}}"&#10;}'
                className="border-border/80 focus-visible:ring-primary/40 h-75 flex-1 resize-none p-3 font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          /* Live Preview Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Seed Controller */}
              <div className="space-y-1">
                <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
                  <label htmlFor="faker-seed-input">Faker Seed</label>
                  <button
                    type="button"
                    onClick={() =>
                      setSampleSeed(Math.floor(Math.random() * 100000))
                    }
                    className="text-primary text-caption flex items-center gap-1 hover:underline"
                  >
                    <PikaIcon icon={RefreshIcon} className="size-3" />
                    Re-roll
                  </button>
                </div>
                <Input
                  id="faker-seed-input"
                  type="number"
                  value={sampleSeed}
                  onChange={(e) => setSampleSeed(Number(e.target.value) || 0)}
                  className="h-8 font-mono text-xs"
                />
              </div>

              {/* HTTP Details */}
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs font-semibold">
                  Status & Method
                </div>
                <div className="bg-muted/40 flex h-8 items-center gap-2 rounded border px-2.5 font-mono text-xs">
                  <span className="text-primary font-bold">{method}</span>
                  <span className="text-muted-foreground truncate">{path}</span>
                  <Badge variant="outline" className="text-mini ml-auto">
                    {statusCode}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Sample Context Editors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="sample-body-input"
                  className="text-muted-foreground block text-xs font-medium"
                >
                  Sample Request Body
                </label>
                <Textarea
                  id="sample-body-input"
                  value={sampleBody}
                  onChange={(e) => setSampleBody(e.target.value)}
                  className="text-caption h-24 resize-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="sample-query-input"
                  className="text-muted-foreground block text-xs font-medium"
                >
                  Sample Query Params
                </label>
                <Textarea
                  id="sample-query-input"
                  value={sampleQuery}
                  onChange={(e) => setSampleQuery(e.target.value)}
                  className="text-caption h-24 resize-none font-mono"
                />
              </div>
            </div>

            {/* Evaluated Output Panel */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-semibold">
                  Evaluated Output {previewResult.isError ? "(Error)" : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void handleCopyPreview();
                  }}
                  className="h-6 gap-1 text-xs"
                >
                  <PikaIcon
                    icon={copied ? CheckTickCircleIcon : CopyIcon}
                    className="size-3"
                  />
                  {copied ? "Copied" : "Copy Output"}
                </Button>
              </div>
              <pre
                aria-label="Template live preview output"
                className={`max-h-75 overflow-x-auto rounded-lg border p-3 font-mono text-xs leading-relaxed focus-visible:ring-1 focus-visible:outline-none ${
                  previewResult.isError
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-muted/30 border-border/80 text-foreground"
                }`}
              >
                <code>{previewResult.output}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </TabsContent>
  );
};
