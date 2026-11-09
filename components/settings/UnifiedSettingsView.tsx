"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  RiHardDrive2Line,
  RiCloudLine,
  RiDownload2Line,
  RiUpload2Line,
  RiLoader2Line,
  RiSaveLine,
  RiDeleteBin6Line,
  RiTerminalBoxLine,
  RiFileCopyLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckLine,
  RiLayoutTopLine,
  RiSideBarLine,
  RiPulseLine,
  RiFolderSettingsLine,
  RiAlertLine,
  RiArrowRightSLine,
  RiSearchLine,
  RiShieldCheckLine,
  RiFlashlightLine,
  RiDatabase2Line,
  RiGitBranchLine,
} from "@remixicon/react";

import type { StorageStatus } from "@/lib/storage/status";
import type { WorkspaceConfig } from "@/lib/storage/config-store";
import type { Project, Scenario } from "@/db/schema";
import { saveWorkspaceName } from "@/lib/actions/settings";
import { updateProject, deleteProject } from "@/lib/actions/projects";
import {
  getProjectCliDetails,
  type ProjectCliDetails,
} from "@/lib/actions/bundle";
import { cn, slugifyPath } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UnifiedSettingsViewProps {
  initialStatus: StorageStatus;
  initialConfig: WorkspaceConfig;
  projects: Project[];
  scenariosByProject: Record<string, Scenario[]>;
  isLogsDbConfigured: boolean;
}

export type DirectionMode = "A" | "B" | "C";

export type SidebarCategoryKey =
  | "workspace-identity"
  | "workspace-storage"
  | "workspace-telemetry"
  | "project-meta"
  | "project-chaos"
  | "project-cli"
  | "danger-zone";

function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "Never";
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

interface SettingsCategoryMeta {
  key: SidebarCategoryKey;
  label: string;
  scope: "workspace" | "project";
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const SETTINGS_CATEGORIES: SettingsCategoryMeta[] = [
  {
    key: "workspace-identity",
    label: "Identity & Branding",
    scope: "workspace",
    icon: RiFolderSettingsLine,
    keywords: ["identity", "branding", "name", "workspace", "rename", "config"],
  },
  {
    key: "workspace-storage",
    label: "Storage & Backup",
    scope: "workspace",
    icon: RiHardDrive2Line,
    keywords: [
      "storage",
      "backup",
      "sqlite",
      "wal",
      "json",
      "export",
      "import",
      "database",
      "disk",
    ],
  },
  {
    key: "workspace-telemetry",
    label: "Telemetry & Cache",
    scope: "workspace",
    icon: RiPulseLine,
    keywords: [
      "telemetry",
      "cache",
      "lru",
      "latency",
      "queue",
      "postgres",
      "history",
      "logs",
    ],
  },
  {
    key: "project-meta",
    label: "Metadata & Routing",
    scope: "project",
    icon: RiGitBranchLine,
    keywords: [
      "metadata",
      "routing",
      "slug",
      "namespace",
      "path",
      "caching",
      "url",
    ],
  },
  {
    key: "project-chaos",
    label: "Chaos & Resilience",
    scope: "project",
    icon: RiFlashlightLine,
    keywords: [
      "chaos",
      "monkey",
      "resilience",
      "scenario",
      "failure",
      "delay",
      "jitter",
      "fault",
    ],
  },
  {
    key: "project-cli",
    label: "CLI Credentials",
    scope: "project",
    icon: RiTerminalBoxLine,
    keywords: [
      "cli",
      "credentials",
      "secret",
      "key",
      "token",
      "fack dev",
      "aes",
      "terminal",
      "curl",
    ],
  },
  {
    key: "danger-zone",
    label: "Danger Zone",
    scope: "project",
    icon: RiAlertLine,
    keywords: ["danger", "delete", "destroy", "purge", "remove"],
  },
];

/**
 * Unified Settings Categorized Multi-Column Architecture
 *
 * Provides a structured, multi-column settings hub replacing single-column stacks.
 * Supports 3 selectable layout directions (defaults to Direction B: Two-Pane Vertical Rail):
 * - Direction B: Two-Pane Categorized Navigation Rail (Linear / GitHub style)
 * - Direction A: Horizontal Scoped Tab-Strip (Vercel / Supabase style)
 * - Direction C: System Health Banner & Quick-Jump Rail (Railway / Postman style)
 */
export const UnifiedSettingsView = ({
  initialStatus,
  initialConfig,
  projects,
  scenariosByProject,
  isLogsDbConfigured,
}: UnifiedSettingsViewProps): React.JSX.Element => {
  const router = useRouter();

  // Layout Direction State (A: Top Tabs, B: Categorized Two-Pane, C: Health & Jump Rail)
  const [direction, setDirection] = React.useState<DirectionMode>(() => {
    if (typeof window === "undefined") {
      return "B";
    }
    const saved = localStorage.getItem("fack_settings_direction");
    return saved === "A" || saved === "B" || saved === "C" ? saved : "B";
  });

  const handleDirectionChange = (newDir: DirectionMode): void => {
    setDirection(newDir);
    localStorage.setItem("fack_settings_direction", newDir);
    toast.success(
      newDir === "B"
        ? "Switched to Direction B: Two-Pane Categorized Navigation Rail"
        : newDir === "A"
          ? "Switched to Direction A: Horizontal Scoped Tabs"
          : "Switched to Direction C: Health Banner & Command Rail",
    );
  };

  // Workspace Identity State
  const [status] = React.useState<StorageStatus>(initialStatus);
  const [workspaceName, setWorkspaceName] = React.useState(
    initialConfig.workspaceName ?? "My Workspace",
  );
  const [savingWorkspace, setSavingWorkspace] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Active Project Selection State
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(
    projects[0]?.id ?? "",
  );
  const activeProject =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0];

  // Project Form State
  const [projectName, setProjectName] = React.useState(
    activeProject?.name ?? "",
  );
  const [projectSlug, setProjectSlug] = React.useState(
    activeProject?.slug ?? "",
  );
  const [projectDescription, setProjectDescription] = React.useState(
    activeProject?.description ?? "",
  );
  const [isCachingEnabled, setIsCachingEnabled] = React.useState(
    activeProject?.isCachingEnabled !== false,
  );
  const [isLoggingEnabled, setIsLoggingEnabled] = React.useState(
    isLogsDbConfigured ? Boolean(activeProject?.isLoggingEnabled) : false,
  );
  const [activeScenarioId, setActiveScenarioId] = React.useState<string | null>(
    activeProject?.activeScenarioId ?? null,
  );
  const [savingProject, setSavingProject] = React.useState(false);

  // Synchronize fields directly on project selection
  const handleSelectProject = (projectId: string): void => {
    setSelectedProjectId(projectId);
    setCliDetails(undefined);
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setProjectName(target.name);
      setProjectSlug(target.slug);
      setProjectDescription(target.description ?? "");
      setIsCachingEnabled(target.isCachingEnabled !== false);
      setIsLoggingEnabled(
        isLogsDbConfigured ? Boolean(target.isLoggingEnabled) : false,
      );
      setActiveScenarioId(target.activeScenarioId ?? null);
    }
  };

  // CLI Credentials State
  const [cliDetails, setCliDetails] = React.useState<
    ProjectCliDetails | undefined
  >(undefined);
  const [loadingCli, setLoadingCli] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedDev, setCopiedDev] = React.useState(false);
  const [copiedCurl, setCopiedCurl] = React.useState(false);
  const [copiedMockBase, setCopiedMockBase] = React.useState(false);
  const [copiedDbPath, setCopiedDbPath] = React.useState(false);

  // Direction Navigation States
  const [activeTabDirectionA, setActiveTabDirectionA] = React.useState<
    "workspace" | "project"
  >("workspace");
  const [sidebarItemDirectionB, setSidebarItemDirectionB] =
    React.useState<SidebarCategoryKey>("workspace-identity");
  const [scopeDirectionC, setScopeDirectionC] = React.useState<
    "workspace" | "project"
  >("workspace");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Project Deletion Modal State
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Load CLI details when active project changes
  React.useEffect(() => {
    const targetId = activeProject?.id;
    if (!targetId) {
      return;
    }

    const controller = new AbortController();

    const loadCli = async (): Promise<void> => {
      try {
        setLoadingCli(true);
        const res = await getProjectCliDetails(targetId);
        if (!controller.signal.aborted) {
          setCliDetails(res);
        }
      } catch {
        if (!controller.signal.aborted) {
          setCliDetails(undefined);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCli(false);
        }
      }
    };

    void loadCli();

    return () => {
      controller.abort();
    };
  }, [activeProject?.id]);

  const handleSaveWorkspace = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmed = workspaceName.trim();
    if (trimmed.length === 0) {
      toast.error("Workspace name cannot be empty");
      return;
    }

    try {
      setSavingWorkspace(true);
      await saveWorkspaceName(trimmed);
      toast.success("Workspace name updated successfully");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update workspace name",
      );
    } finally {
      setSavingWorkspace(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!activeProject) {
      return;
    }

    const trimmedName = projectName.trim();
    const trimmedSlug = slugifyPath(projectSlug.trim());

    if (trimmedName.length === 0) {
      toast.error("Project name cannot be empty");
      return;
    }
    if (trimmedSlug.length === 0) {
      toast.error("Project namespace slug cannot be empty");
      return;
    }

    try {
      setSavingProject(true);
      await updateProject({
        id: activeProject.id,
        name: trimmedName,
        slug: trimmedSlug,
        description: projectDescription.trim() || undefined,
        isCachingEnabled,
        isLoggingEnabled,
        activeScenarioId,
      });
      toast.success("Project settings saved");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update project settings",
      );
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (): Promise<void> => {
    if (!activeProject) {
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteProject(activeProject.id);
      toast.success(`Project "${activeProject.name}" deleted`);
      setDeleteOpen(false);
      setDeleteConfirmText("");
      const remaining = projects.filter((p) => p.id !== activeProject.id);
      if (remaining.length > 0 && remaining[0]) {
        handleSelectProject(remaining[0].id);
      }
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete project",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setImporting(true);
      const text = await file.text();
      const res = await fetch("/api/settings/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error ?? `Import failed with status ${res.status}`,
        );
      }

      const payload = await res.json();
      toast.success(
        `Restored ${payload.restoredProjects ?? 0} projects & ${payload.restoredNotes ?? 0} notes`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const copyToClipboard = (
    text: string,
    setter: (val: boolean) => void,
  ): void => {
    void navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const isLocal = status.mode === "local";
  const badgeLabel = isLocal
    ? "Local · File-Based"
    : status.mode === "selfhosted"
      ? "Self-Hosted · Connected"
      : "Remote Cloud";

  const currentScenarios: Scenario[] = activeProject
    ? (scenariosByProject[activeProject.id] ?? [])
    : [];

  const activeScenarioObj = currentScenarios.find(
    (s) => s.id === activeScenarioId,
  );

  // =========================================================================
  // MULTI-COLUMN COMPONENT BLOCKS
  // =========================================================================

  /**
   * Workspace Identity & Architecture Overview (2-Column Grid)
   */
  const renderWorkspaceIdentity = (): React.JSX.Element => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiFolderSettingsLine className="text-primary h-5 w-5" />
            <CardTitle className="text-base font-semibold">
              Workspace Identity
            </CardTitle>
          </div>
          <CardDescription>
            Visible identifier across local instances and exported bundles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveWorkspace} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="ws-name"
                className="text-foreground text-xs font-medium"
              >
                Workspace Display Name
              </label>
              <Input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. My Workspace"
                maxLength={100}
                className="h-9"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground text-xs">
                Stored locally in <code>fack-config.json</code>
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={savingWorkspace}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {savingWorkspace ? (
                  <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RiSaveLine className="h-3.5 w-3.5" />
                )}
                Save Name
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiShieldCheckLine className="text-success h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                Architecture &amp; Node Status
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {badgeLabel}
            </Badge>
          </div>
          <CardDescription>
            Execution environment tier and resource allocation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-border/40 divide-y text-xs">
            <div className="flex items-center justify-between py-2.5 first:pt-0">
              <dt className="text-muted-foreground font-medium">
                Storage Tier
              </dt>
              <dd className="text-foreground font-semibold">
                {isLocal ? "Tier 1 · Local Machine" : "Tier 2 · Self-Hosted"}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground font-medium">
                SQLite Engine
              </dt>
              <dd className="text-success font-semibold">
                WAL Mode · 64MB Cache
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground font-medium">
                Registered Projects
              </dt>
              <dd className="text-foreground font-semibold tabular-nums">
                {projects.length}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5 last:pb-0">
              <dt className="text-muted-foreground font-medium">
                Scratchpad Notes
              </dt>
              <dd className="text-foreground font-semibold tabular-nums">
                {status.counts.notes}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Storage Architecture & Telemetry Metrics (2-Column Grid)
   */
  const renderStorageSection = (): React.JSX.Element => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            {isLocal ? (
              <RiHardDrive2Line className="text-primary h-5 w-5" />
            ) : (
              <RiCloudLine className="text-primary h-5 w-5" />
            )}
            <CardTitle className="text-base font-semibold">
              Storage &amp; Backup Operations
            </CardTitle>
          </div>
          <CardDescription>
            {isLocal
              ? "Operating in local file-based SQLite mode. Workspaces can be packaged and migrated as JSON bundles."
              : "Operating with remote database synchronization. Schemas and states persist across your engineering cluster."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              {importing ? (
                <RiLoader2Line className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RiUpload2Line className="h-3.5 w-3.5" />
              )}
              Import JSON Backup
            </Button>
            <a
              href="/api/settings/storage"
              download
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 gap-1.5 text-xs font-medium",
              )}
            >
              <RiDownload2Line className="h-3.5 w-3.5" />
              Download JSON Backup
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiDatabase2Line className="text-primary h-5 w-5" />
            <CardTitle className="text-base font-semibold">
              Engine Telemetry &amp; Metrics
            </CardTitle>
          </div>
          <CardDescription>
            File paths, allocation sizes, and snapshot timestamps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-border/40 divide-y text-xs">
            <div className="flex items-center justify-between py-2 first:pt-0">
              <dt className="text-muted-foreground font-medium">
                Database Target
              </dt>
              <dd className="text-caption flex items-center gap-1.5 font-mono">
                <span className="max-w-[220px] truncate" title={status.target}>
                  {status.target}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(status.target, setCopiedDbPath)
                  }
                  className="text-muted-foreground hover:text-foreground"
                  title="Copy path"
                >
                  {copiedDbPath ? (
                    <RiCheckLine className="text-success h-3.5 w-3.5" />
                  ) : (
                    <RiFileCopyLine className="h-3.5 w-3.5" />
                  )}
                </button>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground font-medium">
                Data Directory
              </dt>
              <dd
                className="text-caption max-w-[240px] truncate font-mono"
                title={status.dataDir}
              >
                {status.dataDir}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground font-medium">
                Database Size
              </dt>
              <dd className="text-foreground font-semibold tabular-nums">
                {formatBytes(status.dbSizeBytes)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2 last:pb-0">
              <dt className="text-muted-foreground font-medium">Last Backup</dt>
              <dd className="text-foreground font-medium">
                {formatDate(status.lastBackupAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Telemetry & Health Diagnostics (2-Column Grid)
   */
  const renderTelemetrySection = (): React.JSX.Element => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiPulseLine className="text-primary h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                Request Logging Telemetry
              </CardTitle>
            </div>
            <Badge
              variant={isLogsDbConfigured ? "default" : "secondary"}
              className="text-xs"
            >
              {isLogsDbConfigured ? "Connected" : "Not Configured"}
            </Badge>
          </div>
          <CardDescription>
            Logs capture incoming mock invocations for debugging and replay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            {isLogsDbConfigured
              ? "Dedicated PostgreSQL logging database is attached. High-throughput non-blocking queues buffer request telemetry."
              : "Set the LOGS_POSTGRES_URL environment variable to record live headers, query params, and payloads."}
          </p>
          <dl className="divide-border/40 divide-y pt-1 text-xs">
            <div className="flex items-center justify-between py-2 first:pt-0">
              <dt className="text-muted-foreground font-medium">
                Batch Ingestion Size
              </dt>
              <dd className="text-foreground font-semibold tabular-nums">
                25 requests
              </dd>
            </div>
            <div className="flex items-center justify-between py-2 last:pb-0">
              <dt className="text-muted-foreground font-medium">
                Maximum Drain Interval
              </dt>
              <dd className="text-foreground font-semibold tabular-nums">
                250ms
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiFlashlightLine className="text-warning h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                LRU Memory Caching Tier
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="border-success/30 text-success text-xs"
            >
              Sub-5ms Latency
            </Badge>
          </div>
          <CardDescription>
            In-memory dual-layer LRU cache with negative slug miss defense.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <dl className="divide-border/40 divide-y text-xs">
            <div className="flex items-center justify-between py-2 first:pt-0">
              <dt className="text-muted-foreground font-medium">
                Mock Routes Cache
              </dt>
              <dd className="text-foreground font-semibold tabular-nums">
                500 entries (LRU)
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-muted-foreground font-medium">
                Negative Slug Cache
              </dt>
              <dd className="text-foreground font-semibold tabular-nums">
                1,000 entries (LRU)
              </dd>
            </div>
            <div className="flex items-center justify-between py-2 last:pb-0">
              <dt className="text-muted-foreground font-medium">
                Penetration Defense
              </dt>
              <dd className="text-success font-semibold">
                Zero-Overhead Active
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-caption pt-1 leading-relaxed">
            Prevents database cache penetration on high-frequency 404 scans and
            rapid iteration loops.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Project Metadata & Routing Engine (2-Column Grid Form)
   */
  const renderProjectMetaForm = (): React.JSX.Element => {
    if (!activeProject) {
      return (
        <Card className="border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No projects exist in this workspace. Create one from the dashboard
            to configure settings.
          </p>
        </Card>
      );
    }

    return (
      <form onSubmit={handleSaveProject} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: Project Identity & Base URL Routing */}
          <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiGitBranchLine className="text-primary h-5 w-5" />
                  <CardTitle className="text-base font-semibold">
                    Project Identity &amp; Routing
                  </CardTitle>
                </div>
              </div>
              <CardDescription>
                Configure endpoint namespace paths and routing boundaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <label
                  htmlFor="proj-name"
                  className="text-foreground text-xs font-medium"
                >
                  Project Name
                </label>
                <Input
                  id="proj-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Billing Microservice"
                  maxLength={100}
                  className="h-9"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor="proj-slug"
                  className="text-foreground text-xs font-medium"
                >
                  Namespace Slug
                </label>
                <Input
                  id="proj-slug"
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(slugifyPath(e.target.value))}
                  placeholder="e.g. billing"
                  maxLength={100}
                  className="h-9 font-mono text-xs"
                  required
                />
              </div>

              <div className="bg-muted/30 space-y-1.5 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Live Mock Endpoint Base
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `/api/mock/${projectSlug || "default"}`,
                        setCopiedMockBase,
                      )
                    }
                    className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    {copiedMockBase ? (
                      <RiCheckLine className="text-success h-3.5 w-3.5" />
                    ) : (
                      <RiFileCopyLine className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedMockBase ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <code className="text-primary block font-mono text-xs font-semibold break-all select-all">
                  /api/mock/{projectSlug || "..."}/...
                </code>
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor="proj-desc"
                  className="text-foreground text-xs font-medium"
                >
                  Description
                </label>
                <Textarea
                  id="proj-desc"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Virtual endpoints for integration testing..."
                  rows={2}
                  className="resize-none text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Execution Engine & Telemetry Controls */}
          <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader>
              <div className="flex items-center gap-2">
                <RiPulseLine className="text-primary h-5 w-5" />
                <CardTitle className="text-base font-semibold">
                  Execution Engine Rules
                </CardTitle>
              </div>
              <CardDescription>
                High-performance caching, request logs, and resilience rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 pr-2">
                  <span className="block text-xs font-semibold">
                    Mock Response Caching
                  </span>
                  <span className="text-muted-foreground text-caption block">
                    Cache responses in bounded LRU memory for instant latency.
                  </span>
                </div>
                <Switch
                  checked={isCachingEnabled}
                  onCheckedChange={setIsCachingEnabled}
                  aria-label="Toggle mock caching"
                />
              </div>

              <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 pr-2">
                  <span className="block text-xs font-semibold">
                    Capture Request History
                  </span>
                  <span className="text-muted-foreground text-caption block">
                    {isLogsDbConfigured
                      ? "Persist payloads and status codes in PostgreSQL."
                      : "Disabled: LOGS_POSTGRES_URL environment variable missing."}
                  </span>
                </div>
                <Switch
                  checked={isLoggingEnabled}
                  onCheckedChange={setIsLoggingEnabled}
                  disabled={!isLogsDbConfigured}
                  aria-label="Toggle request logging"
                />
              </div>

              <div className="bg-muted/20 space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    Active Chaos Profile
                  </span>
                  <Badge variant="outline" className="text-mini">
                    {activeScenarioObj ? activeScenarioObj.name : "Disabled"}
                  </Badge>
                </div>
                <Select
                  value={activeScenarioId ?? "none"}
                  onValueChange={(val) =>
                    setActiveScenarioId(val === "none" ? null : val)
                  }
                >
                  <SelectTrigger className="h-8 w-full text-xs font-medium">
                    <SelectValue placeholder="Select chaos profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      None (Standard Behavior)
                    </SelectItem>
                    {currentScenarios.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={savingProject}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            {savingProject ? (
              <RiLoader2Line className="h-4 w-4 animate-spin" />
            ) : (
              <RiSaveLine className="h-4 w-4" />
            )}
            Save Project Settings
          </Button>
        </div>
      </form>
    );
  };

  /**
   * Chaos Monkey & Resiliency Profiles (2-Column Grid)
   */
  const renderProjectChaosSection = (): React.JSX.Element => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiFlashlightLine className="text-warning h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                Chaos Monkey Simulation
              </CardTitle>
            </div>
            <Badge
              variant={activeScenarioObj ? "default" : "outline"}
              className="text-xs"
            >
              {activeScenarioObj ? "Active Profile" : "Idle"}
            </Badge>
          </div>
          <CardDescription>
            Inject simulated latencies, HTTP 500 fault spikes, and rate-limiting
            to test client resiliency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="chaos-profile-select"
              className="text-foreground block text-xs font-medium"
            >
              Active Profile Selection
            </label>
            <Select
              value={activeScenarioId ?? "none"}
              onValueChange={(val) => {
                const newId = val === "none" ? null : val;
                setActiveScenarioId(newId);
                if (activeProject) {
                  void updateProject({
                    id: activeProject.id,
                    activeScenarioId: newId,
                  });
                  toast.success(
                    newId ? "Chaos profile applied" : "Chaos profile removed",
                  );
                }
              }}
            >
              <SelectTrigger
                id="chaos-profile-select"
                className="h-9 w-full text-xs font-medium"
              >
                <SelectValue placeholder="Choose simulation scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  None (Zero Fault Injection)
                </SelectItem>
                {currentScenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            When active, mock requests hitting{" "}
            <code>/api/mock/{projectSlug}/...</code> will dynamically apply the
            profile&apos;s configured delay and failure rates.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Profile Rule Inspector
          </CardTitle>
          <CardDescription>
            Real-time parameters loaded for this active project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeScenarioObj ? (
            <dl className="divide-border/40 divide-y text-xs">
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <dt className="text-muted-foreground font-medium">
                  Profile Name
                </dt>
                <dd className="text-foreground font-semibold">
                  {activeScenarioObj.name}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground font-medium">Status</dt>
                <dd className="text-success font-semibold">
                  Armed &amp; Injecting
                </dd>
              </div>
              <div className="space-y-1 py-2.5 last:pb-0">
                <dt className="text-muted-foreground font-medium">
                  Description
                </dt>
                <dd className="text-foreground leading-relaxed">
                  {activeScenarioObj.description ||
                    "Default latency and fault injection rules applied."}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
              No chaos profile currently armed. Select a scenario on the left to
              inspect simulation rules.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Project CLI Credentials & Snippets (2-Column Grid)
   */
  const renderCliCredentials = (): React.JSX.Element => (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiTerminalBoxLine className="text-primary h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                Developer CLI &amp; AES-256 Credentials
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              AES-256-GCM
            </Badge>
          </div>
          <CardDescription>
            Run headless mock servers locally or sync design bundles into your
            CI/CD pipelines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCli ? (
            <div className="flex items-center justify-center p-8">
              <RiLoader2Line className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : !cliDetails ? (
            <p className="text-muted-foreground text-xs">
              Select an active project above to retrieve its developer
              credentials.
            </p>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="project-secret-key"
                className="text-foreground block text-xs font-medium"
              >
                Project Secret Key
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="project-secret-key"
                  readOnly
                  type={showSecret ? "text" : "password"}
                  value={cliDetails.secretKey}
                  className="bg-muted/30 h-9 font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                  className="h-9 shrink-0 gap-1 text-xs"
                >
                  {showSecret ? (
                    <RiEyeOffLine className="h-4 w-4" />
                  ) : (
                    <RiEyeLine className="h-4 w-4" />
                  )}
                  {showSecret ? "Hide" : "Reveal"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(cliDetails.secretKey, setCopiedKey)
                  }
                  className="h-9 shrink-0 gap-1 text-xs"
                >
                  {copiedKey ? (
                    <RiCheckLine className="text-success h-4 w-4" />
                  ) : (
                    <RiFileCopyLine className="h-4 w-4" />
                  )}
                  {copiedKey ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom 2-Column Grid: Terminal Snippets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Headless Dev Server
            </CardTitle>
            <CardDescription className="text-xs">
              Runs the Fack mock daemon on your local port with hot reload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  cliDetails?.devCommand ?? `fack dev --project ${projectSlug}`
                }
                className="bg-muted/30 h-9 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    cliDetails?.devCommand ??
                      `fack dev --project ${projectSlug}`,
                    setCopiedDev,
                  )
                }
                className="h-9 shrink-0 gap-1 text-xs"
              >
                {copiedDev ? (
                  <RiCheckLine className="text-success h-4 w-4" />
                ) : (
                  <RiFileCopyLine className="h-4 w-4" />
                )}
                {copiedDev ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              API Test via cURL
            </CardTitle>
            <CardDescription className="text-xs">
              Validate API authentication headers directly from the terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`curl -H "x-fack-key: ${cliDetails?.secretKey ? "..." : ""}" http://localhost:3000/api/mock/${projectSlug}`}
                className="bg-muted/30 h-9 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `curl -H "x-fack-key: ${cliDetails?.secretKey ?? ""}" http://localhost:3000/api/mock/${projectSlug}`,
                    setCopiedCurl,
                  )
                }
                className="h-9 shrink-0 gap-1 text-xs"
              >
                {copiedCurl ? (
                  <RiCheckLine className="text-success h-4 w-4" />
                ) : (
                  <RiFileCopyLine className="h-4 w-4" />
                )}
                {copiedCurl ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  /**
   * Danger Zone (2-Column Grid)
   */
  const renderDangerZone = (): React.JSX.Element => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
        <CardHeader>
          <div className="text-destructive flex items-center gap-2">
            <RiAlertLine className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">
              Delete Project
            </CardTitle>
          </div>
          <CardDescription>
            Irreversible action. Deletes all mock routes, scenarios, and cached
            schemas for this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeProject ? (
            <div className="space-y-2">
              <span className="text-foreground block text-xs font-semibold">
                Target Project: {activeProject.name} (
                <code>{activeProject.slug}</code>)
              </span>
              <p className="text-muted-foreground text-xs">
                After deletion, API clients calling{" "}
                <code>/api/mock/{activeProject.slug}</code> will receive 404
                responses immediately.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              No active project selected.
            </p>
          )}
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={!activeProject}
            onClick={() => setDeleteOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RiDeleteBin6Line className="h-4 w-4" />
            Delete {activeProject?.name ?? "Project"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Offline Data Directory Safety
          </CardTitle>
          <CardDescription>
            Local workspace retention rules and zero cloud leakage.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-xs">
          <p>
            In Local Tier 1 mode, all your projects are stored in{" "}
            <code>{status.dataDir}</code>.
          </p>
          <p>
            To perform a complete offline purge, take a JSON backup first from
            the Storage section, then remove the database file listed under
            Engine Telemetry.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const filteredCategories = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return SETTINGS_CATEGORIES;
    }
    return SETTINGS_CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(q) ||
        cat.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  return (
    <div className="space-y-8">
      {/* =================================================================
                Top Header Bar with Layout Direction Switcher
                ================================================================= */}
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings Hub</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage workspace infrastructure, project namespaces, chaos
            simulations, and CLI keys.
          </p>
        </div>

        {/* Direction Switcher Pill Group */}
        <div className="bg-muted/40 flex items-center gap-1.5 self-start rounded-lg border p-1 sm:self-center">
          <button
            type="button"
            onClick={() => handleDirectionChange("B")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              direction === "B"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Two-Pane Vertical Sidebar Navigation"
          >
            <RiSideBarLine className="h-3.5 w-3.5" />
            <span>Two-Pane Rail (Default)</span>
          </button>
          <button
            type="button"
            onClick={() => handleDirectionChange("A")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              direction === "A"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Horizontal Scoped Tab-Strip"
          >
            <RiLayoutTopLine className="h-3.5 w-3.5" />
            <span>Horizontal Tabs</span>
          </button>
          <button
            type="button"
            onClick={() => handleDirectionChange("C")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              direction === "C"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="System Health Banner & Quick-Jump Rail"
          >
            <RiPulseLine className="h-3.5 w-3.5" />
            <span>Command Rail</span>
          </button>
        </div>
      </div>

      {/* =================================================================
                DIRECTION B: TWO-PANE CATEGORIZED NAVIGATION RAIL (DEFAULT)
                ================================================================= */}
      {direction === "B" && (
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[280px_1fr]">
          {/* Left Vertical Navigation Rail */}
          <div className="bg-card sticky top-20 space-y-6 rounded-xl border p-4 shadow-xs">
            {/* Search Filter Box */}
            <div className="relative">
              <RiSearchLine className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="bg-muted/20 h-8 pr-7 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-2 right-2 p-0.5 text-xs"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active Project Switcher Capsule */}
            {projects.length > 0 && (
              <div className="space-y-1.5 border-b pb-4">
                <span className="text-muted-foreground text-caption block font-medium tracking-wide">
                  Active Project
                </span>
                <Select
                  value={activeProject?.id}
                  onValueChange={(val) => {
                    if (val) {
                      handleSelectProject(val);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-full text-xs font-medium">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredCategories.length === 0 ? (
              <div className="space-y-2 py-6 text-center">
                <p className="text-muted-foreground text-xs">
                  No settings match &ldquo;{searchQuery}&rdquo;
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setSearchQuery("")}
                  className="h-7 text-xs"
                >
                  Clear Filter
                </Button>
              </div>
            ) : (
              <>
                {/* Category Group 1: Workspace Scope */}
                {filteredCategories.some((c) => c.scope === "workspace") && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-caption block px-2 font-medium tracking-wide">
                      Workspace Scope
                    </span>
                    {filteredCategories
                      .filter((c) => c.scope === "workspace")
                      .map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = sidebarItemDirectionB === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSidebarItemDirectionB(cat.key)}
                            className={cn(
                              "group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              isSelected
                                ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Icon
                                className={cn(
                                  "h-3.5 w-3.5",
                                  isSelected
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground",
                                )}
                              />
                              <span>{cat.label}</span>
                            </span>
                            <RiArrowRightSLine
                              className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                isSelected
                                  ? "opacity-100 translate-x-0.5 text-primary"
                                  : "opacity-30 group-hover:opacity-70",
                              )}
                            />
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Category Group 2: Project Scope */}
                {filteredCategories.some((c) => c.scope === "project") && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-caption block px-2 font-medium tracking-wide">
                      Project: {activeProject?.name ?? "None"}
                    </span>
                    {filteredCategories
                      .filter((c) => c.scope === "project")
                      .map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = sidebarItemDirectionB === cat.key;
                        const isDanger = cat.key === "danger-zone";
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSidebarItemDirectionB(cat.key)}
                            className={cn(
                              "group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              isSelected
                                ? isDanger
                                  ? "bg-destructive/15 text-destructive font-semibold"
                                  : "bg-accent text-accent-foreground font-semibold shadow-2xs"
                                : isDanger
                                  ? "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Icon
                                className={cn(
                                  "h-3.5 w-3.5",
                                  isSelected
                                    ? isDanger
                                      ? "text-destructive"
                                      : "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground",
                                )}
                              />
                              <span>{cat.label}</span>
                            </span>
                            <RiArrowRightSLine
                              className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                isSelected
                                  ? isDanger
                                    ? "opacity-100 text-destructive"
                                    : "opacity-100 translate-x-0.5 text-primary"
                                  : "opacity-30 group-hover:opacity-70",
                              )}
                            />
                          </button>
                        );
                      })}
                  </div>
                )}
              </>
            )}

            {/* Rail Footer Status Badge */}
            <div className="text-muted-foreground text-caption flex items-center justify-between border-t pt-4">
              <span>{badgeLabel}</span>
              <span className="font-mono">
                {formatBytes(status.dbSizeBytes)}
              </span>
            </div>
          </div>

          {/* Right Focused Content Pane (Multi-Column Grid Views) */}
          <div className="min-w-0 space-y-6">
            {sidebarItemDirectionB === "workspace-identity" &&
              renderWorkspaceIdentity()}
            {sidebarItemDirectionB === "workspace-storage" &&
              renderStorageSection()}
            {sidebarItemDirectionB === "workspace-telemetry" &&
              renderTelemetrySection()}
            {sidebarItemDirectionB === "project-meta" &&
              renderProjectMetaForm()}
            {sidebarItemDirectionB === "project-chaos" &&
              renderProjectChaosSection()}
            {sidebarItemDirectionB === "project-cli" && renderCliCredentials()}
            {sidebarItemDirectionB === "danger-zone" && renderDangerZone()}
          </div>
        </div>
      )}

      {/* =================================================================
                DIRECTION A: HORIZONTAL SCOPED TABS (VERCEL / SUPABASE STYLE)
                ================================================================= */}
      {direction === "A" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTabDirectionA("workspace")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold border-b-2 -mb-1 transition-colors focus-visible:outline-none",
                  activeTabDirectionA === "workspace"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Workspace Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTabDirectionA("project")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold border-b-2 -mb-1 transition-colors focus-visible:outline-none",
                  activeTabDirectionA === "project"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Project Settings: {activeProject?.name ?? "None"}
              </button>
            </div>

            {activeTabDirectionA === "project" && projects.length > 1 && (
              <Select
                value={activeProject?.id}
                onValueChange={(val) => {
                  if (val) {
                    handleSelectProject(val);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-48 text-xs font-medium">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {activeTabDirectionA === "workspace" && (
            <div className="space-y-6">
              {renderWorkspaceIdentity()}
              {renderStorageSection()}
              {renderTelemetrySection()}
            </div>
          )}

          {activeTabDirectionA === "project" && (
            <div className="space-y-6">
              {renderProjectMetaForm()}
              {renderProjectChaosSection()}
              {renderCliCredentials()}
              {renderDangerZone()}
            </div>
          )}
        </div>
      )}

      {/* =================================================================
                DIRECTION C: LIVE HEALTH BANNER & COMMAND RAIL (RAILWAY STYLE)
                ================================================================= */}
      {direction === "C" && (
        <div className="space-y-6">
          {/* Top Health Capsule Banner */}
          <div className="bg-card flex flex-col items-start justify-between gap-4 rounded-xl border p-4 shadow-xs md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
                  <span className="bg-success relative inline-flex h-2 w-2 rounded-full" />
                </span>
                <span className="text-sm font-semibold">
                  Cluster System Healthy
                </span>
                <Badge variant="outline" className="text-xs">
                  {badgeLabel}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                Database: <code className="font-mono">{status.target}</code> (
                {formatBytes(status.dbSizeBytes)}) · WAL Pragmas Active
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/api/settings/storage"
                download
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 gap-1.5 text-xs font-medium",
                )}
              >
                <RiDownload2Line className="h-3.5 w-3.5" />
                Quick Backup
              </a>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copyToClipboard(
                    cliDetails?.devCommand ??
                      `fack dev --project ${projectSlug}`,
                    setCopiedDev,
                  )
                }
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <RiTerminalBoxLine className="h-3.5 w-3.5" />
                {copiedDev ? "Copied" : "Copy CLI Dev"}
              </Button>
            </div>
          </div>

          {/* Scope Selector Rail */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScopeDirectionC("workspace")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  scopeDirectionC === "workspace"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                Workspace Scope
              </button>
              <button
                type="button"
                onClick={() => setScopeDirectionC("project")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  scopeDirectionC === "project"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                Project Scope: {activeProject?.name ?? "None"}
              </button>
            </div>

            {scopeDirectionC === "project" && projects.length > 1 && (
              <Select
                value={activeProject?.id}
                onValueChange={(val) => {
                  if (val) {
                    handleSelectProject(val);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-48 text-xs font-medium">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {scopeDirectionC === "workspace" && (
            <div className="space-y-6">
              {renderWorkspaceIdentity()}
              {renderStorageSection()}
              {renderTelemetrySection()}
            </div>
          )}

          {scopeDirectionC === "project" && (
            <div className="space-y-6">
              {renderProjectMetaForm()}
              {renderProjectChaosSection()}
              {renderCliCredentials()}
              {renderDangerZone()}
            </div>
          )}
        </div>
      )}

      {/* =================================================================
                Delete Project Confirmation Dialog
                ================================================================= */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <RiAlertLine className="h-5 w-5" />
              <span>Delete Project Permanently</span>
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. To confirm, please type{" "}
              <strong className="text-foreground">{activeProject?.name}</strong>{" "}
              below:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={activeProject?.name}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmText("");
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={
                deleteLoading || deleteConfirmText !== activeProject?.name
              }
              className="gap-1.5"
            >
              {deleteLoading ? (
                <RiLoader2Line className="h-4 w-4 animate-spin" />
              ) : (
                <RiDeleteBin6Line className="h-4 w-4" />
              )}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
