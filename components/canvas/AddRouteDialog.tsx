"use client";

import * as React from "react";
import { toast } from "sonner";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import * as PikaCore from "@pikaicons/core-free";
import { PikaIcon } from "@pikaicons/react";
import { createRoute } from "@/lib/actions/routes";
import { httpMethods } from "@/lib/validators";
import {
  getEffectiveRoutePath,
  extractRoutePathParameters,
} from "@/lib/services/route-param.service";
import type { Endpoint, Route } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
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

const addRouteFormSchema = z.object({
  endpointId: z.string().min(1, "Please select an endpoint group."),
  method: z.enum(httpMethods),
  path: z.string().min(1, "Route path is required.").max(200),
  statusCode: z
    .number()
    .int()
    .min(100, "Status code must be between 100 and 599.")
    .max(599, "Status code must be between 100 and 599."),
  includeDefaults: z.boolean(),
});

type AddRouteFormData = z.infer<typeof addRouteFormSchema>;

interface AddRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoints: Endpoint[];
  onRouteAdded: (newRoute: Route) => void;
}

/**
 * Modal form dialog to register a new route under an endpoint group.
 */
export const AddRouteDialog = ({
  open,
  onOpenChange,
  endpoints,
  onRouteAdded,
}: AddRouteDialogProps): React.JSX.Element => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddRouteFormData>({
    resolver: zodResolver(addRouteFormSchema),
    defaultValues: {
      endpointId: endpoints[0]?.id ?? "",
      method: "GET",
      path: "",
      statusCode: 200,
      includeDefaults: true,
    },
  });

  const watchedPath = useWatch({ control, name: "path" }) ?? "";
  const watchedEndpointId = useWatch({ control, name: "endpointId" }) ?? "";
  const selectedEndpoint = endpoints.find((ep) => ep.id === watchedEndpointId);
  const effectivePath = getEffectiveRoutePath(
    selectedEndpoint?.basePath ?? "",
    watchedPath,
  );
  const detectedParameters = React.useMemo(() => {
    return extractRoutePathParameters(effectivePath);
  }, [effectivePath]);

  React.useEffect(() => {
    if (open && endpoints.length > 0) {
      reset({
        endpointId: endpoints[0].id,
        method: "GET",
        path: "",
        statusCode: 200,
        includeDefaults: true,
      });
    }
  }, [open, endpoints, reset]);

  const onSubmit = async (values: AddRouteFormData) => {
    const cleanPath = values.path.trim().startsWith("/")
      ? values.path.trim()
      : `/${values.path.trim()}`;

    try {
      let responseSchema = "{}";
      if (values.includeDefaults) {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        // 1. "id" field is always first at the top
        const idParam = detectedParameters.find((p) => p.name === "id");
        if (idParam) {
          properties.id = {
            type: "string",
            "x-fack-source": {
              type: "pathParam",
              name: "id",
            },
          };
        } else {
          properties.id = {
            type: "string",
            faker: "string.uuid",
            "x-faker": "string.uuid",
          };
        }
        required.push("id");

        // 2. All other URL parameters placed in between "id" and timestamps
        for (const param of detectedParameters) {
          if (param.name !== "id") {
            properties[param.name] = {
              type: "string",
              "x-fack-source": {
                type: "pathParam",
                name: param.name,
              },
            };
            required.push(param.name);
          }
        }

        // 3. Timestamps placed strictly at the end
        properties.createdAt = {
          type: "string",
          faker: "date.past",
          "x-faker": "date.past",
        };
        required.push("createdAt");

        properties.updatedAt = {
          type: "string",
          faker: "date.recent",
          "x-faker": "date.recent",
        };
        required.push("updatedAt");

        responseSchema = JSON.stringify({
          type: "object",
          properties,
          required,
        });
      }

      const newRoute = await createRoute({
        endpointId: values.endpointId,
        method: values.method,
        path: cleanPath,
        statusCode: values.statusCode,
        responseSchema,
      });

      toast.success("Route node created!");
      onRouteAdded(newRoute);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create route",
      );
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Route Node</DialogTitle>
            <DialogDescription>
              Create a new endpoint route segment on the visual canvas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="add-route-endpoint"
                className="text-sm font-semibold"
              >
                Endpoint Group
              </label>
              {endpoints.length === 0 ? (
                <div
                  role="alert"
                  className="border-warning/25 bg-warning/10 text-warning flex flex-col gap-1.5 rounded-md border p-3 text-xs"
                >
                  <span className="font-semibold">
                    No Endpoint Groups found.
                  </span>
                  <span className="text-muted-foreground text-xs leading-normal font-normal">
                    You need at least one Endpoint Group to add routes. Go to
                    the <strong>Endpoints</strong> tab to create one.
                  </span>
                </div>
              ) : (
                <Controller
                  control={control}
                  name="endpointId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="add-route-endpoint"
                        aria-label="Endpoint Group"
                        aria-invalid={!!errors.endpointId}
                        aria-describedby={
                          errors.endpointId
                            ? "add-route-endpoint-error"
                            : undefined
                        }
                        className="w-full"
                      >
                        <span className="truncate" data-slot="select-value">
                          {endpoints.find((ep) => ep.id === field.value)
                            ? `${endpoints.find((ep) => ep.id === field.value)?.name} (${endpoints.find((ep) => ep.id === field.value)?.basePath || "/"})`
                            : "Select a group..."}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {endpoints.map((ep) => (
                            <SelectItem key={ep.id} value={ep.id}>
                              {ep.name} ({ep.basePath || "/"})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.endpointId && (
                <span
                  id="add-route-endpoint-error"
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {errors.endpointId.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 flex flex-col gap-2">
                <label
                  htmlFor="add-route-method"
                  className="text-sm font-semibold"
                >
                  Method
                </label>
                <Controller
                  control={control}
                  name="method"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting || endpoints.length === 0}
                    >
                      <SelectTrigger
                        id="add-route-method"
                        aria-label="HTTP Method"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <label htmlFor="route-path" className="text-sm font-semibold">
                  Sub-Path
                </label>
                <Input
                  id="route-path"
                  {...register("path")}
                  placeholder="e.g. /login or /:id"
                  maxLength={200}
                  disabled={isSubmitting || endpoints.length === 0}
                  aria-invalid={!!errors.path}
                  aria-describedby={
                    errors.path ? "route-path-error" : undefined
                  }
                />
                {detectedParameters.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-muted-foreground text-xs font-medium">
                      Detected parameters:
                    </span>
                    {detectedParameters.map((p) => (
                      <span
                        key={p.name}
                        className="bg-primary/10 text-primary border-primary/20 rounded border px-1.5 py-0.5 font-mono text-xs font-semibold"
                      >
                        :{p.name}
                      </span>
                    ))}
                  </div>
                )}
                {errors.path && (
                  <span
                    id="route-path-error"
                    role="alert"
                    className="text-destructive text-xs"
                  >
                    {errors.path.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="route-statusCode"
                className="text-sm font-semibold"
              >
                Default Status Code
              </label>
              <Input
                id="route-statusCode"
                type="number"
                {...register("statusCode", { valueAsNumber: true })}
                placeholder="200"
                min={100}
                max={599}
                disabled={isSubmitting || endpoints.length === 0}
                aria-invalid={!!errors.statusCode}
                aria-describedby={
                  errors.statusCode ? "route-statusCode-error" : undefined
                }
              />
              {errors.statusCode && (
                <span
                  id="route-statusCode-error"
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {errors.statusCode.message}
                </span>
              )}
            </div>
            <div className="bg-muted/10 flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <label
                  htmlFor="include-defaults"
                  className="block text-xs font-semibold"
                >
                  Generate Starter Schema
                </label>
                <span className="text-muted-foreground block text-xs leading-normal">
                  Include default JSON schema properties (`id`, `createdAt`,
                  `updatedAt`).
                </span>
              </div>
              <Controller
                control={control}
                name="includeDefaults"
                render={({ field }) => (
                  <Switch
                    id="include-defaults"
                    aria-label="Generate starter schema"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting || endpoints.length === 0}
                  />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              title="Cancel creation"
              aria-label="Cancel creation"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || endpoints.length === 0}
              aria-disabled={isSubmitting}
              title="Create Node"
              aria-label="Create Node"
            >
              {isSubmitting ? (
                <>
                  <PikaIcon
                    icon={PikaCore.RefreshIcon}
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Node</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
