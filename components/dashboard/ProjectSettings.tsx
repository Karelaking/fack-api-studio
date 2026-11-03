"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProjectSchema } from "@/lib/validators";
import { getProjectUrl } from "@/lib/utils/project-slug";
import { LoggerRegistry } from "@/lib/logger-registry";

const uiTrace = LoggerRegistry.getTrace("ui-project-settings");
import {
  RiLoader2Line,
  RiDownloadCloud2Line,
  RiDeleteBin6Line,
  RiSaveLine,
  RiAlertLine,
  RiTerminalBoxLine,
  RiKey2Line,
  RiFileCopyLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckLine,
} from "@remixicon/react";
import {
  getProjectCliDetails,
  type ProjectCliDetails,
} from "@/lib/actions/bundle";
import { updateProject, deleteProject } from "@/lib/actions/projects";
import { cn, slugifyPath } from "@/lib/utils";
import type { Project } from "@/db/schema";
import { Button } from "@/components/ui/button";
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
import type { Scenario } from "@/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProjectSettingsProps {
  project: Project;
  isLogsDbConfigured: boolean;
  scenarios: Scenario[];
}

/**
 * Client component displaying workspace settings forms.
 * Allows updating project metadata and deleting the project entirely.
 */
export function ProjectSettings({
  project,
  isLogsDbConfigured,
  scenarios,
}: ProjectSettingsProps): React.JSX.Element {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [cliDetails, setCliDetails] = React.useState<
    ProjectCliDetails | undefined
  >(undefined);
  const [showSecretKey, setShowSecretKey] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedPull, setCopiedPull] = React.useState(false);
  const [copiedDev, setCopiedDev] = React.useState(false);

  React.useEffect(() => {
    getProjectCliDetails(project.id)
      .then((details) => setCliDetails(details))
      .catch(() => {});
  }, [project.id]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description ?? "",
      isLoggingEnabled: isLogsDbConfigured ? project.isLoggingEnabled : false,
      isCachingEnabled: project.isCachingEnabled !== false,
      activeScenarioId: project.activeScenarioId,
    },
  });

  const onUpdate = async (values: {
    name?: string;
    slug?: string;
    description?: string;
    isLoggingEnabled?: boolean;
    isCachingEnabled?: boolean;
    activeScenarioId?: string | null;
  }): Promise<void> => {
    const cleanedSlug = values.slug
      ? values.slug.trim().replace(/^\/+|\/+$/g, "")
      : project.slug;

    uiTrace.traceCall("handleUpdate", values.name, cleanedSlug);
    try {
      const updated = await updateProject({
        id: project.id,
        name: values.name?.trim(),
        slug: cleanedSlug,
        description: values.description?.trim(),
        isLoggingEnabled: values.isLoggingEnabled,
        isCachingEnabled: values.isCachingEnabled,
        activeScenarioId: values.activeScenarioId,
      });
      toast.success("Workspace settings updated!");
      uiTrace.traceSuccess("handleUpdate", updated.slug);
      router.refresh();
      // Redirect if slug changed
      if (updated.slug !== project.slug) {
        router.push(getProjectUrl(updated.slug, "settings"));
      }
    } catch (err) {
      toast.error("Failed to update workspace settings");
      uiTrace.traceError("handleUpdate", err);
    }
  };

  const handleDelete = (): void => {
    if (deleteConfirmText !== project.name) {
      toast.error("Please type the project name correctly to confirm.");
      return;
    }
    uiTrace.traceCall("handleDelete", project.id);
    setDeleteLoading(true);
    startTransition(async () => {
      try {
        await deleteProject(project.id);
        toast.success(`Project "${project.name}" deleted successfully.`);
        uiTrace.traceSuccess("handleDelete", "deleted");
        setDeleteOpen(false);
        setDeleteConfirmText("");
        router.push("/");
      } catch (err) {
        toast.error("Failed to delete workspace");
        uiTrace.traceError("handleDelete", err);
      } finally {
        setDeleteLoading(false);
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Settings Form Card */}
      <form onSubmit={handleSubmit(onUpdate)}>
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure workspace metadata, names, and path slugs.
            </CardDescription>
          </CardHeader>
          {}
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-semibold">
                  Workspace Name
                </label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Billing Microservice"
                  maxLength={100}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <span className="text-destructive text-xs">
                    {errors.name.message}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="slug" className="text-sm font-semibold">
                  Namespace Slug
                </label>
                <Input
                  id="slug"
                  {...register("slug", {
                    onChange: (e) =>
                      setValue("slug", slugifyPath(e.target.value)),
                  })}
                  placeholder="billing-microservice"
                  maxLength={100}
                  disabled={isSubmitting}
                />
                {errors.slug && (
                  <span className="text-destructive text-xs">
                    {errors.slug.message}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  Determines the network mock base URL: `/{project.slug}/...`
                </span>
              </div>
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-semibold">
                  Description
                </label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="API virtualizer endpoints for billing tasks..."
                  maxLength={500}
                  disabled={isSubmitting}
                  className="h-24 resize-none"
                />
                {errors.description && (
                  <span className="text-destructive text-xs">
                    {errors.description.message}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "bg-muted/10 flex items-center justify-between border p-4",
                  !isLogsDbConfigured && "border-amber-500/20 bg-amber-500/5",
                )}
              >
                <div className="space-y-0.5">
                  <label
                    htmlFor="isLoggingEnabled"
                    className="block text-sm font-semibold"
                  >
                    Capture Request History
                  </label>
                  <span className="text-muted-foreground block text-xs leading-normal">
                    {isLogsDbConfigured
                      ? "When enabled, incoming mock requests are stored in the database for debugging and latency analytics."
                      : "Request logging is currently disabled because LOGS_POSTGRES_URL is not configured in environment variables."}
                  </span>
                </div>
                <Controller
                  control={control}
                  name="isLoggingEnabled"
                  render={({ field }) => (
                    <Switch
                      id="isLoggingEnabled"
                      aria-label="Capture request history"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting || !isLogsDbConfigured}
                    />
                  )}
                />
              </div>
              <div className="bg-muted/10 flex items-center justify-between border p-4">
                <div className="space-y-0.5">
                  <label
                    htmlFor="isCachingEnabled"
                    className="block text-sm font-semibold"
                  >
                    Enable Mock Caching
                  </label>
                  <span className="text-muted-foreground block text-xs leading-normal">
                    When enabled, mock response pages and single objects are
                    cached to decrease latency and reduce server generation
                    efforts.
                  </span>
                </div>
                <Controller
                  control={control}
                  name="isCachingEnabled"
                  render={({ field }) => (
                    <Switch
                      id="isCachingEnabled"
                      aria-label="Cache mock responses"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>

              <div className="bg-muted/10 flex items-center justify-between border p-4">
                <div className="space-y-0.5">
                  <label
                    htmlFor="activeScenarioId"
                    className="block text-sm font-semibold"
                  >
                    Chaos Monkey Profile
                  </label>
                  <span className="text-muted-foreground block text-xs leading-normal">
                    Apply project-wide latency or error modifiers to test
                    frontend resilience.
                  </span>
                </div>
                <Controller
                  control={control}
                  name="activeScenarioId"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(nextScenarioId) =>
                        field.onChange(
                          nextScenarioId === "none" ? null : nextScenarioId,
                        )
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        className="w-50"
                        id="activeScenarioId"
                        aria-label="Active scenario"
                      >
                        <SelectValue placeholder="Select a scenario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Disabled)</SelectItem>
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
            </div>
          </CardContent>
          {}
          <CardFooter className="justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              aria-disabled={isSubmitting}
              title="Save Changes"
              aria-label="Save Changes"
            >
              {isSubmitting ? (
                <>
                  <RiLoader2Line
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <RiSaveLine className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Local CLI & Encrypted Bundle Card */}
      <Card className="border-primary/20 from-card to-card/60 bg-gradient-to-b">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiTerminalBoxLine className="text-primary h-5 w-5" />
              <span>Local CLI Runner (Zero-Overhead Dev)</span>
            </CardTitle>
            <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
              AES-256-GCM
            </span>
          </div>
          <CardDescription>
            Develop your frontend with a sub-10ms local mock server. No Docker,
            databases, or fullstack server required. Your project specification
            is encrypted with AES-256-GCM and executed locally in process
            memory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Secret Key Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="secret-key-input"
                className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold"
              >
                <RiKey2Line className="h-4 w-4" />
                <span>Project Secret Key (Decryption Key)</span>
              </label>
              <span className="text-muted-foreground text-[11px]">
                Never leaves your device in plaintext
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="secret-key-input"
                  readOnly
                  type={showSecretKey ? "text" : "password"}
                  value={cliDetails?.secretKey || "Generating key..."}
                  className="bg-background/50 pr-10 font-mono text-xs"
                  aria-label="Project Secret Key"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 p-1 transition-colors"
                  title={showSecretKey ? "Hide key" : "Show key"}
                >
                  {showSecretKey ? (
                    <RiEyeOffLine className="h-4 w-4" />
                  ) : (
                    <RiEyeLine className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (cliDetails?.secretKey) {
                    void navigator.clipboard.writeText(cliDetails.secretKey);
                    setCopiedKey(true);
                    toast.success("Secret key copied to clipboard!");
                    setTimeout(() => setCopiedKey(false), 2000);
                  }
                }}
              >
                {copiedKey ? (
                  <>
                    <RiCheckLine className="mr-1.5 h-4 w-4 text-green-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <RiFileCopyLine className="mr-1.5 h-4 w-4" />
                    <span>Copy Key</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick CLI Commands */}
          <div className="space-y-3">
            <span className="text-muted-foreground text-xs font-semibold">
              Run in your frontend project repository:
            </span>

            <div className="border-border/60 bg-muted/30 space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-mono text-[11px]">
                  Step 1: Pull encrypted bundle
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (cliDetails) {
                      void navigator.clipboard.writeText(
                        cliDetails.pullCommand,
                      );
                      setCopiedPull(true);
                      toast.success("Pull command copied!");
                      setTimeout(() => setCopiedPull(false), 2000);
                    }
                  }}
                  className="text-primary flex items-center gap-1 text-xs hover:underline"
                >
                  {copiedPull ? (
                    <>
                      <RiCheckLine className="h-3.5 w-3.5 text-green-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <RiFileCopyLine className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-foreground/90 selection:bg-primary/20 overflow-x-auto font-mono text-xs">
                <code>
                  {cliDetails?.pullCommand ||
                    `fack pull ${project.slug} --key <KEY>`}
                </code>
              </pre>
            </div>

            <div className="border-border/60 bg-muted/30 space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-mono text-[11px]">
                  Step 2: Start local mock server
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText("fack dev");
                    setCopiedDev(true);
                    toast.success("Dev command copied!");
                    setTimeout(() => setCopiedDev(false), 2000);
                  }}
                  className="text-primary flex items-center gap-1 text-xs hover:underline"
                >
                  {copiedDev ? (
                    <>
                      <RiCheckLine className="h-3.5 w-3.5 text-green-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <RiFileCopyLine className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-foreground/90 overflow-x-auto font-mono text-xs">
                <code>fack dev</code>
              </pre>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-border/40 justify-between border-t pt-4">
          <span className="text-muted-foreground text-xs">
            Supports stateful in-memory CRUD, Faker data &amp; chaos simulation.
          </span>
          <Button
            type="button"
            variant="default"
            onClick={() => {
              window.open(`/api/projects/${project.slug}/bundle`, "_blank");
            }}
          >
            <RiDownloadCloud2Line className="mr-2 h-4 w-4" />
            Download fack.enc
          </Button>
        </CardFooter>
      </Card>

      {/* Code Export Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            <RiDownloadCloud2Line className="text-primary h-5 w-5" />
            <span>Export Codebase</span>
          </CardTitle>
          <CardDescription>
            Download a production-ready Express.js + TypeScript backend
            generated from your visual routes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            The exported project includes a fully configured{" "}
            <code>package.json</code>, <code>tsconfig.json</code>, and route
            handlers mapped to your designed schema.
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.open(`/api/projects/${project.slug}/export`, "_blank");
            }}
          >
            <RiDownloadCloud2Line className="mr-2 h-4 w-4" />
            Download ZIP
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone Card */}
      <Card variant="danger">
        <CardHeader>
          <CardTitle variant="destructive">
            <RiAlertLine className="h-5 w-5" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>
            Irreversibly delete this workspace. All endpoints, custom routes,
            schema layouts, and topologies will be deleted permanently.
          </CardDescription>
        </CardHeader>
        {}
        <CardFooter variant="destructive" className="justify-between">
          <span className="text-destructive text-xs font-medium">
            This action is not reversible.
          </span>
          <Dialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) {
                setDeleteConfirmText("");
              }
            }}
          >
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="destructive"
                  title="Delete Workspace"
                  aria-label="Delete Workspace"
                />
              }
            >
              <RiDeleteBin6Line className="h-4 w-4" />
              <span>Delete Workspace</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                {}
                <DialogTitle variant="destructive">
                  <RiAlertLine className="h-5 w-5" />
                  <span>Confirm Deletion</span>
                </DialogTitle>
                <DialogDescription>
                  Are you absolutely sure you want to delete project **
                  {project.name}**? This will delete all endpoints, mock schema
                  synthesis pipelines, and coordinates. This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <div className="my-2 grid gap-2 text-left">
                <label
                  htmlFor="confirm-text"
                  className="text-muted-foreground text-xs font-semibold"
                >
                  To confirm, type{" "}
                  <span className="text-foreground selection:bg-primary/20 font-mono font-bold">
                    &quot;{project.name}&quot;
                  </span>{" "}
                  below:
                </label>
                <Input
                  id="confirm-text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={project.name}
                  variant="mono"
                  disabled={deleteLoading}
                  autoComplete="off"
                />
              </div>
              {}
              <DialogFooter className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  title="Cancel deletion"
                  aria-label="Cancel deletion"
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
                  title="Permanently Delete Workspace"
                  aria-label="Permanently Delete Workspace"
                  onClick={handleDelete}
                  disabled={
                    deleteLoading ||
                    isPending ||
                    deleteConfirmText !== project.name
                  }
                  aria-disabled={deleteLoading || isPending}
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
    </div>
  );
}
