"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  RiLoader2Line,
  RiDownloadCloud2Line,
  RiDeleteBin6Line,
  RiSaveLine,
  RiAlertLine,
  RiTerminalBoxLine,
  RiFileCopyLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckLine,
  RiArrowRightSLine,
  RiFolderSettingsLine,
  RiFlashlightLine,
  RiGitBranchLine,
  RiPulseLine,
  RiExternalLinkLine,
} from "@remixicon/react";

import { updateProjectSchema, type UpdateProjectInput } from "@/lib/validators";
import { getProjectUrl } from "@/lib/utils/project-slug";
import { LoggerRegistry } from "@/lib/logger-registry";
import {
  getProjectCliDetails,
  type ProjectCliDetails,
} from "@/lib/actions/bundle";
import { updateProject, deleteProject } from "@/lib/actions/projects";
import { cn, slugifyPath } from "@/lib/utils";
import type { Project, Scenario } from "@/db/schema";
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

const uiTrace = LoggerRegistry.getTrace("ui-project-settings");

export interface ProjectSettingsProps {
  project: Project;
  isLogsDbConfigured: boolean;
  scenarios: Scenario[];
}

export type ProjectSettingsCategory =
  | "meta"
  | "chaos"
  | "cli"
  | "export"
  | "danger";

/**
 * Categorized Multi-Column Project Settings Hub
 *
 * Eliminates single-column stacked forms with a two-pane categorized
 * navigation rail and responsive multi-column field cards.
 */
export function ProjectSettings({
  project,
  isLogsDbConfigured,
  scenarios,
}: ProjectSettingsProps): React.JSX.Element {
  const router = useRouter();
  const [activeCategory, setActiveCategory] =
    React.useState<ProjectSettingsCategory>("meta");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [cliDetails, setCliDetails] = React.useState<
    ProjectCliDetails | undefined
  >(undefined);
  const [loadingCli, setLoadingCli] = React.useState(false);
  const [showSecretKey, setShowSecretKey] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedPull, setCopiedPull] = React.useState(false);
  const [copiedDev, setCopiedDev] = React.useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const targetId = project.id;

    const loadCli = async (): Promise<void> => {
      try {
        setLoadingCli(true);
        const details = await getProjectCliDetails(targetId);
        if (isMounted) {
          setCliDetails(details);
        }
      } catch {
        if (isMounted) {
          setCliDetails(undefined);
        }
      } finally {
        if (isMounted) {
          setLoadingCli(false);
        }
      }
    };

    void loadCli();

    return () => {
      isMounted = false;
    };
  }, [project.id]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description || "",
      isLoggingEnabled: project.isLoggingEnabled,
      isCachingEnabled: project.isCachingEnabled,
      activeScenarioId: project.activeScenarioId,
    },
  });

  const watchedSlug = watch("slug");
  const watchedActiveScenarioId = watch("activeScenarioId");
  const activeScenario = scenarios.find(
    (s) => s.id === watchedActiveScenarioId,
  );

  const onUpdate = async (data: UpdateProjectInput): Promise<void> => {
    uiTrace.traceCall("handleUpdate", data.id, data.name);
    try {
      const updated = await updateProject(data);
      toast.success("Project settings updated successfully!");
      uiTrace.traceSuccess("handleUpdate", updated.id);
      if (updated.slug !== project.slug) {
        router.push(getProjectUrl(updated.slug, "settings"));
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error("Failed to update project settings");
      uiTrace.traceError("handleUpdate", err);
    }
  };

  const handleDelete = (): void => {
    setDeleteLoading(true);
    uiTrace.traceCall("handleDelete", project.id);
    startTransition(async () => {
      try {
        await deleteProject(project.id);
        toast.success(`Project "${project.name}" deleted.`);
        uiTrace.traceSuccess("handleDelete", "deleted");
        setDeleteOpen(false);
        setDeleteConfirmText("");
        router.push("/");
      } catch (err) {
        toast.error("Failed to delete project");
        uiTrace.traceError("handleDelete", err);
      } finally {
        setDeleteLoading(false);
      }
    });
  };

  const copyToClipboard = (
    text: string,
    setter: (val: boolean) => void,
  ): void => {
    void navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {project.name} Settings
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {project.slug}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Configure endpoint namespace routing, response caching, chaos
            injection, and CLI keys.
          </p>
        </div>
        <Link
          href="/settings"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5 h-8 text-xs font-medium self-start sm:self-center",
          )}
        >
          <RiFolderSettingsLine className="h-3.5 w-3.5" />
          <span>All Workspace Settings</span>
          <RiExternalLinkLine className="h-3 w-3 opacity-60" />
        </Link>
      </div>

      {/* Two-Pane Categorized Layout */}
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[260px_1fr]">
        {/* Left Category Rail */}
        <div className="bg-card sticky top-20 space-y-4 rounded-xl border p-3 shadow-xs">
          <div className="border-border/50 space-y-1.5 border-b px-2 pt-1 pb-2.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground block text-xs font-medium">
                Target Endpoint Base
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `/api/mock/${watchedSlug || project.slug}`,
                    setCopiedEndpoint,
                  )
                }
                className="text-muted-foreground hover:text-foreground h-6 gap-1 px-1.5 text-[11px]"
              >
                {copiedEndpoint ? (
                  <RiCheckLine className="h-3 w-3 text-emerald-500" />
                ) : (
                  <RiFileCopyLine className="h-3 w-3" />
                )}
                <span>{copiedEndpoint ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            <code className="text-primary bg-muted/40 block rounded-md px-2 py-1 font-mono text-xs break-all">
              /api/mock/{watchedSlug || project.slug}
            </code>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveCategory("meta")}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === "meta"
                  ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <RiGitBranchLine className="h-3.5 w-3.5" />
                <span>Metadata &amp; Routing</span>
              </span>
              <RiArrowRightSLine className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("chaos")}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === "chaos"
                  ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <RiFlashlightLine className="h-3.5 w-3.5" />
                <span>Chaos &amp; Resilience</span>
              </span>
              <RiArrowRightSLine className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("cli")}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === "cli"
                  ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <RiTerminalBoxLine className="h-3.5 w-3.5" />
                <span>Developer CLI &amp; Keys</span>
              </span>
              <RiArrowRightSLine className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("export")}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === "export"
                  ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <RiDownloadCloud2Line className="h-3.5 w-3.5" />
                <span>Codebase &amp; Export</span>
              </span>
              <RiArrowRightSLine className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("danger")}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === "danger"
                  ? "bg-destructive/10 text-destructive font-semibold shadow-2xs"
                  : "text-destructive hover:bg-destructive/10",
              )}
            >
              <span className="flex items-center gap-2">
                <RiAlertLine className="h-3.5 w-3.5" />
                <span>Danger Zone</span>
              </span>
              <RiArrowRightSLine className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* Right Content Area (Multi-Column Grid Views) */}
        <div className="min-w-0 space-y-6">
          {/* Category: Metadata & Routing */}
          {activeCategory === "meta" && (
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-border/60 bg-card shadow-xs">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <RiGitBranchLine className="text-primary h-5 w-5" />
                      <CardTitle className="text-base font-semibold">
                        Project Identity &amp; Routing
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Configure namespace path slugs and project identification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-1.5">
                      <label
                        htmlFor="proj-name-input"
                        className="text-foreground text-xs font-medium"
                      >
                        Project Name
                      </label>
                      <Input
                        id="proj-name-input"
                        {...register("name")}
                        placeholder="Billing Microservice"
                        maxLength={100}
                        disabled={isSubmitting}
                        className="h-9"
                      />
                      {errors.name && (
                        <span className="text-destructive text-xs">
                          {errors.name.message}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-1.5">
                      <label
                        htmlFor="proj-slug-input"
                        className="text-foreground text-xs font-medium"
                      >
                        Namespace Slug
                      </label>
                      <Input
                        id="proj-slug-input"
                        {...register("slug", {
                          onChange: (e) =>
                            setValue("slug", slugifyPath(e.target.value)),
                        })}
                        placeholder="billing"
                        maxLength={100}
                        disabled={isSubmitting}
                        className="h-9 font-mono text-xs"
                      />
                      {errors.slug && (
                        <span className="text-destructive text-xs">
                          {errors.slug.message}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-1.5">
                      <label
                        htmlFor="proj-desc-input"
                        className="text-foreground text-xs font-medium"
                      >
                        Description
                      </label>
                      <Textarea
                        id="proj-desc-input"
                        {...register("description")}
                        placeholder="Virtual endpoints for billing tasks..."
                        maxLength={500}
                        disabled={isSubmitting}
                        rows={2}
                        className="resize-none text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-xs">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <RiPulseLine className="text-primary h-5 w-5" />
                      <CardTitle className="text-base font-semibold">
                        Execution Engine Rules
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Sub-5ms response caching and request log persistence.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-border/40 divide-y">
                      <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-foreground block text-xs font-semibold">
                            Enable Mock Caching
                          </span>
                          <span className="text-muted-foreground block text-[11px] leading-relaxed">
                            Store responses in LRU cache to guarantee sub-5ms
                            latency.
                          </span>
                        </div>
                        <Controller
                          control={control}
                          name="isCachingEnabled"
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                              aria-label="Toggle mock caching"
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-foreground block text-xs font-semibold">
                            Capture Request History
                          </span>
                          <span className="text-muted-foreground block text-[11px] leading-relaxed">
                            {isLogsDbConfigured
                              ? "Store incoming mock payloads in PostgreSQL."
                              : "Disabled: LOGS_POSTGRES_URL environment variable missing."}
                          </span>
                        </div>
                        <Controller
                          control={control}
                          name="isLoggingEnabled"
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting || !isLogsDbConfigured}
                              aria-label="Toggle request logging"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <RiLoader2Line className="h-4 w-4 animate-spin" />
                  ) : (
                    <RiSaveLine className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {/* Category: Chaos & Resilience */}
          {activeCategory === "chaos" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RiFlashlightLine className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-base font-semibold">
                        Chaos Monkey Simulation
                      </CardTitle>
                    </div>
                    <Badge
                      variant={activeScenario ? "default" : "outline"}
                      className="text-xs"
                    >
                      {activeScenario ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Inject latency delays and HTTP 500 error spikes to test
                    frontend resilience.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-chaos-select"
                      className="text-foreground block text-xs font-medium"
                    >
                      Active Scenario Profile
                    </label>
                    <Controller
                      control={control}
                      name="activeScenarioId"
                      render={({ field }) => (
                        <Select
                          value={field.value || "none"}
                          onValueChange={(nextId) => {
                            const resolved = nextId === "none" ? null : nextId;
                            field.onChange(resolved);
                            void updateProject({
                              id: project.id,
                              activeScenarioId: resolved,
                            });
                            toast.success(
                              resolved
                                ? "Chaos profile armed"
                                : "Chaos profile disarmed",
                            );
                          }}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger
                            id="project-chaos-select"
                            className="h-9 w-full text-xs font-medium"
                          >
                            <SelectValue placeholder="Select simulation scenario" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              None (Zero Fault Injection)
                            </SelectItem>
                            {scenarios.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Requests to{" "}
                    <code>/api/mock/{watchedSlug || project.slug}/...</code>{" "}
                    will dynamically inject configured latency and error status
                    codes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Profile Rule Inspector
                  </CardTitle>
                  <CardDescription>
                    Real-time chaos parameters applied to this project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeScenario ? (
                    <dl className="divide-border/40 divide-y text-xs">
                      <div className="flex items-center justify-between py-2.5 first:pt-0">
                        <dt className="text-muted-foreground font-medium">
                          Scenario Name
                        </dt>
                        <dd className="text-foreground font-mono font-semibold">
                          {activeScenario.name}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-muted-foreground font-medium">
                          Status
                        </dt>
                        <dd className="font-semibold text-emerald-500">
                          Armed &amp; Injecting
                        </dd>
                      </div>
                      <div className="space-y-1 py-2.5 last:pb-0">
                        <dt className="text-muted-foreground font-medium">
                          Notes
                        </dt>
                        <dd className="text-muted-foreground leading-relaxed">
                          {activeScenario.description || "No custom notes set."}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-xs">
                      No chaos scenario currently active. Select one on the left
                      to inspect parameters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Category: Developer CLI & Keys */}
          {activeCategory === "cli" && (
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
                    Execute local headless mock servers with zero network
                    overhead.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCli ? (
                    <div className="flex items-center justify-center p-8">
                      <RiLoader2Line className="text-muted-foreground h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="project-settings-secret"
                        className="text-foreground block text-xs font-medium"
                      >
                        Project Secret Key (Decryption Token)
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="project-settings-secret"
                          readOnly
                          type={showSecretKey ? "text" : "password"}
                          value={cliDetails?.secretKey || "Generating key..."}
                          className="bg-muted/30 h-9 font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="h-9 shrink-0 gap-1 text-xs"
                        >
                          {showSecretKey ? (
                            <RiEyeOffLine className="h-4 w-4" />
                          ) : (
                            <RiEyeLine className="h-4 w-4" />
                          )}
                          {showSecretKey ? "Hide" : "Reveal"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (cliDetails?.secretKey) {
                              copyToClipboard(
                                cliDetails.secretKey,
                                setCopiedKey,
                              );
                            }
                          }}
                          className="h-9 shrink-0 gap-1 text-xs"
                        >
                          {copiedKey ? (
                            <RiCheckLine className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <RiFileCopyLine className="h-4 w-4" />
                          )}
                          {copiedKey ? "Copied" : "Copy Key"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-border/60 bg-card shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">
                      Pull Offline Bundle
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sync mock definitions directly into your frontend
                      repository.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={
                          cliDetails?.pullCommand || `fack pull ${project.slug}`
                        }
                        className="bg-muted/30 h-9 font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (cliDetails?.pullCommand) {
                            copyToClipboard(
                              cliDetails.pullCommand,
                              setCopiedPull,
                            );
                          }
                        }}
                        className="h-9 shrink-0 gap-1 text-xs"
                      >
                        {copiedPull ? (
                          <RiCheckLine className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <RiFileCopyLine className="h-4 w-4" />
                        )}
                        {copiedPull ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">
                      Start Headless Dev CLI
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Run local daemon with hot-reload and stateful in-memory
                      CRUD.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={cliDetails?.devCommand || "fack dev"}
                        className="bg-muted/30 h-9 font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            cliDetails?.devCommand || "fack dev",
                            setCopiedDev,
                          )
                        }
                        className="h-9 shrink-0 gap-1 text-xs"
                      >
                        {copiedDev ? (
                          <RiCheckLine className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <RiFileCopyLine className="h-4 w-4" />
                        )}
                        {copiedDev ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Category: Codebase & Export */}
          {activeCategory === "export" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <RiDownloadCloud2Line className="text-primary h-5 w-5" />
                    <CardTitle className="text-base font-semibold">
                      Encrypted Mock Bundle
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Download standalone <code>fack.enc</code> file executable by
                    any local CLI runner.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Contains all routes, OpenAPI definitions, Faker rules, and
                    chaos parameters encrypted with AES-256-GCM.
                  </p>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `/api/projects/${project.slug}/bundle`,
                        "_blank",
                      );
                    }}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <RiDownloadCloud2Line className="h-4 w-4" />
                    Download fack.enc
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <RiGitBranchLine className="text-primary h-5 w-5" />
                    <CardTitle className="text-base font-semibold">
                      Express.js + TypeScript ZIP
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Export ready-to-deploy Express codebase generated from your
                    visual routes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Includes configured <code>package.json</code>,{" "}
                    <code>tsconfig.json</code>, and typed route controllers.
                  </p>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `/api/projects/${project.slug}/export`,
                        "_blank",
                      );
                    }}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <RiDownloadCloud2Line className="h-4 w-4" />
                    Download ZIP
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Category: Danger Zone */}
          {activeCategory === "danger" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
                <CardHeader>
                  <div className="text-destructive flex items-center gap-2">
                    <RiAlertLine className="h-5 w-5" />
                    <CardTitle className="text-base font-semibold">
                      Delete Workspace
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Irreversibly delete this project workspace and all
                    endpoints.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    All endpoints, mock routes, synthesized schemas, and request
                    history will be permanently erased.
                  </p>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <RiDeleteBin6Line className="h-4 w-4" />
                    <span>Delete Workspace</span>
                  </Button>

                  <Dialog
                    open={deleteOpen}
                    onOpenChange={(open) => {
                      setDeleteOpen(open);
                      if (!open) {
                        setDeleteConfirmText("");
                      }
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                          <RiAlertLine className="h-5 w-5" />
                          <span>Confirm Deletion</span>
                        </DialogTitle>
                        <DialogDescription>
                          Are you absolutely sure you want to delete project{" "}
                          <strong className="text-foreground">
                            {project.name}
                          </strong>
                          ? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="my-2 grid gap-2 text-left">
                        <label
                          htmlFor="confirm-text"
                          className="text-muted-foreground text-xs font-semibold"
                        >
                          To confirm, type{" "}
                          <span className="text-foreground font-mono font-bold">
                            &quot;{project.name}&quot;
                          </span>{" "}
                          below:
                        </label>
                        <Input
                          id="confirm-text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={project.name}
                          disabled={deleteLoading}
                          className="font-mono text-sm"
                          autoComplete="off"
                        />
                      </div>
                      <DialogFooter className="mt-2">
                        <Button
                          type="button"
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
                          type="button"
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={
                            deleteLoading ||
                            isPending ||
                            deleteConfirmText !== project.name
                          }
                          className="gap-1.5"
                        >
                          {(deleteLoading || isPending) && (
                            <RiLoader2Line className="h-4 w-4 animate-spin" />
                          )}
                          <span>Permanently Delete</span>
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>

              <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Data Protection &amp; Backups
                  </CardTitle>
                  <CardDescription>
                    Offline recovery recommendations before deletion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-3 text-xs leading-relaxed">
                  <p>
                    We recommend downloading the project bundle under the{" "}
                    <strong>Codebase &amp; Export</strong> category before
                    proceeding with permanent deletion.
                  </p>
                  <p>
                    Offline bundles can be restored at any time via the{" "}
                    <strong>Settings Hub</strong> import function.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
