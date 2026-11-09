"use client";

// Log rows use `role="button"` because they wrap nested controls (expand,
// copy); a native <button> cannot contain them.
/* eslint-disable jsx-a11y/prefer-tag-over-role */

import * as React from "react";
import {
  RiDeleteBin6Line,
  RiRefreshLine,
  RiSearchLine,
  RiTimeLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiTerminalBoxLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { clearRequestLogs, getRequestLogs } from "@/lib/actions/logs";
import type { RequestLog } from "@/db/schema";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getLatencyBadgeClass,
  getMethodBadgeClass,
  getStatusBadgeClass,
} from "@/lib/utils/method-colors";

interface ProjectLogsProps {
  projectId: string;
  initialLogs: RequestLog[];
}

export const ProjectLogs = ({
  projectId,
  initialLogs,
}: ProjectLogsProps): React.JSX.Element => {
  const [logs, setLogs] = React.useState<RequestLog[]>(initialLogs);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "2xx" | "3xx" | "4xx" | "5xx"
  >("all");
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const refreshed = await getRequestLogs(projectId);
      setLogs(refreshed);
      toast.success("Logs refreshed");
    } catch {
      toast.error("Failed to refresh logs");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all request logs for this project?",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await clearRequestLogs(projectId);
      setLogs([]);
      setExpandedLogId(null);
      toast.success("Logs cleared successfully");
    } catch {
      toast.error("Failed to clear logs");
    } finally {
      setLoading(false);
    }
  };

  // Filter logs based on search and status code filters
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.path.toLowerCase().includes(search.toLowerCase()) ||
        log.method.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "2xx")
        return log.statusCode >= 200 && log.statusCode < 300;
      if (statusFilter === "3xx")
        return log.statusCode >= 300 && log.statusCode < 400;
      if (statusFilter === "4xx")
        return log.statusCode >= 400 && log.statusCode < 500;
      if (statusFilter === "5xx") return log.statusCode >= 500;

      return true;
    });
  }, [logs, search, statusFilter]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  // @tanstack/react-virtual returns non-memoizable APIs; React Compiler will
  // intentionally skip memoizing this component.
  // eslint-disable-next-line react/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {/* Top action header: search and filters */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-md min-w-60 flex-1 items-center gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <RiSearchLine className="text-muted-foreground h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by method or path..."
              aria-label="Filter logs by method or path"
            />
          </InputGroup>
          <div className="bg-muted/30 flex border p-0.5">
            {(["all", "2xx", "3xx", "4xx", "5xx"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  "px-2.5 py-1 text-mini font-bold tracking-wide uppercase transition-all",
                  statusFilter === filter
                    ? "bg-background text-foreground border-border/20 border shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Refresh Logs"
            aria-label="Refresh Logs"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RiRefreshLine
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            <span>Refresh</span>
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            title="Clear Logs"
            aria-label="Clear Logs"
            onClick={handleClear}
            disabled={loading || logs.length === 0}
          >
            <RiDeleteBin6Line className="h-4 w-4" />
            <span>Clear Logs</span>
          </Button>
        </div>
      </div>

      {/* Main logs display grid */}
      <div
        ref={parentRef}
        className="bg-card scrollbar-subtle flex-1 overflow-y-auto border"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <RiTerminalBoxLine className="text-muted-foreground/30 h-10 w-10" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                No Request Logs Found
              </span>
              <span className="text-muted-foreground max-w-sm text-xs leading-normal">
                {search || statusFilter !== "all"
                  ? "No logs match your current search queries or status filters."
                  : "Send HTTP requests to your mock endpoint paths to populate this live console feed."}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const log = filteredLogs[virtualRow.index];
              if (!log) return null;
              const isExpanded = expandedLogId === log.id;

              let parsedHeaders: Record<string, string> = {};
              try {
                parsedHeaders = JSON.parse(log.headers ?? "{}");
              } catch {}

              let parsedQueryParams: Record<string, string> = {};
              try {
                parsedQueryParams = JSON.parse(log.queryParams ?? "{}");
              } catch {}

              let formattedBody = log.responsePayload || "";
              try {
                const parsed = JSON.parse(formattedBody);
                formattedBody = JSON.stringify(parsed, null, 2);
              } catch {}

              return (
                <div
                  key={log.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="hover:bg-muted/10 border-border/40 border-b transition-all"
                >
                  {/* Summary Bar */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`Log details for ${log.method} ${log.path}`}
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedLogId(isExpanded ? null : log.id);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-4 px-4 py-3 text-xs font-medium select-none"
                  >
                    <span className="text-muted-foreground/60 flex w-16 items-center gap-1 font-mono">
                      <RiTimeLine className="h-3 w-3" />
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-micro font-bold tracking-wider uppercase",
                        getMethodBadgeClass(log.method),
                      )}
                    >
                      {log.method}
                    </span>
                    <span className="text-foreground flex-1 truncate font-mono">
                      {log.path}
                    </span>
                    <span className="text-muted-foreground/80 hidden items-center gap-0.5 sm:inline-flex">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded border px-1 py-0.5 font-mono text-mini",
                          getLatencyBadgeClass(log.latency),
                        )}
                      >
                        {log.latency}ms
                      </span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded border px-2 py-0.5 font-mono text-mini font-bold",
                        getStatusBadgeClass(log.statusCode),
                      )}
                    >
                      {log.statusCode}
                    </span>
                    {isExpanded ? (
                      <RiArrowDownSLine className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <RiArrowRightSLine className="text-muted-foreground h-4 w-4" />
                    )}
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="bg-muted/10 text-foreground text-mini space-y-3 border-t px-4 py-3 font-mono">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Headers */}
                        <div className="space-y-1">
                          <span className="text-muted-foreground text-micro font-bold tracking-wider uppercase">
                            Request Headers
                          </span>
                          {Object.keys(parsedHeaders).length === 0 ? (
                            <div className="text-muted-foreground/50 text-micro py-1 italic">
                              No request headers found
                            </div>
                          ) : (
                            <div className="bg-card scrollbar-subtle max-h-32 space-y-0.5 overflow-x-auto border p-2">
                              {Object.entries(parsedHeaders).map(
                                ([key, value]) => (
                                  <div key={key} className="flex gap-1.5">
                                    <span className="text-primary shrink-0 font-semibold">
                                      {key}:
                                    </span>
                                    <span className="text-muted-foreground break-all">
                                      {value}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>

                        {/* Query Params */}
                        <div className="space-y-1">
                          <span className="text-muted-foreground text-micro font-bold tracking-wider uppercase">
                            Query Parameters
                          </span>
                          {Object.keys(parsedQueryParams).length === 0 ? (
                            <div className="text-muted-foreground/50 text-micro py-1 italic">
                              No query parameters sent
                            </div>
                          ) : (
                            <div className="bg-card scrollbar-subtle max-h-32 space-y-0.5 overflow-x-auto border p-2">
                              {Object.entries(parsedQueryParams).map(
                                ([key, value]) => (
                                  <div key={key} className="flex gap-1.5">
                                    <span className="text-info shrink-0 font-semibold">
                                      {key}:
                                    </span>
                                    <span className="text-muted-foreground break-all">
                                      {value}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Response Payload */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-micro font-bold tracking-wider uppercase">
                          Response Payload
                        </span>
                        <div className="bg-muted scrollbar-subtle max-h-60 overflow-y-auto border p-2">
                          <pre className="text-xs leading-normal whitespace-pre-wrap select-all">
                            {formattedBody || "Empty Response"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
