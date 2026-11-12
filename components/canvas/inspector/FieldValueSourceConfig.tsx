"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FakerProviderSelect } from "@/components/edit-bar/FakerProviderSelect";
import { getProviderByValue } from "@/lib/faker-registry";

export interface FieldValueSourceConfigProps {
  sourceType: "faker" | "pathParam" | "static";
  setSourceType: (type: "faker" | "pathParam" | "static") => void;
  selectedParamName: string;
  setSelectedParamName: (name: string) => void;
  availableParams: { name: string }[];
  staticValue: string;
  setStaticValue: (val: string) => void;
  fakerProvider: string;
  setFakerProvider: (provider: string) => void;
  fieldType: string;
  loading: boolean;
}

/**
 * Value source selector and configuration section for a field.
 * Allows toggling between URL Param binding, FAPI Random generator, and Static scalar value.
 */
export const FieldValueSourceConfig = ({
  sourceType,
  setSourceType,
  selectedParamName,
  setSelectedParamName,
  availableParams,
  staticValue,
  setStaticValue,
  fakerProvider,
  setFakerProvider,
  fieldType,
  loading,
}: FieldValueSourceConfigProps): React.JSX.Element => {
  const selectedProvider = fakerProvider
    ? getProviderByValue(fakerProvider)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Field Value Source Pills */}
      <div className="space-y-1.5">
        <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
          Field Value Source
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            aria-pressed={sourceType === "pathParam"}
            onClick={() => setSourceType("pathParam")}
            disabled={loading}
            className={cn(
              "h-7 rounded-md border px-1 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              sourceType === "pathParam"
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            URL Param
          </button>
          <button
            type="button"
            aria-pressed={sourceType === "faker"}
            onClick={() => setSourceType("faker")}
            disabled={loading}
            className={cn(
              "h-7 rounded-md border px-1 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              sourceType === "faker"
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            FAPI Random
          </button>
          <button
            type="button"
            aria-pressed={sourceType === "static"}
            onClick={() => setSourceType("static")}
            disabled={loading}
            className={cn(
              "h-7 rounded-md border px-1 font-mono text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              sourceType === "static"
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Static Value
          </button>
        </div>
      </div>

      {/* Source Specific Settings */}
      {sourceType === "pathParam" ? (
        <div className="space-y-1.5">
          <label
            htmlFor="field-param-name"
            className="text-muted-foreground block text-xs font-bold tracking-wider uppercase"
          >
            Select Route Parameter
          </label>
          {availableParams.length === 0 ? (
            <div className="border-warning/20 bg-warning/10 text-warning rounded-md border p-2 text-xs">
              No parameters found in route path. Add a segment like{" "}
              <span className="font-mono font-bold">/:id</span> to the route
              path.
            </div>
          ) : (
            <Select
              value={selectedParamName}
              onValueChange={setSelectedParamName}
              disabled={loading}
            >
              <SelectTrigger
                id="field-param-name"
                className="h-8 w-full font-mono text-xs"
              >
                <SelectValue placeholder="Select param" />
              </SelectTrigger>
              <SelectContent>
                {availableParams.map((p) => (
                  <SelectItem
                    key={p.name}
                    value={p.name}
                    className="font-mono text-xs"
                  >
                    :{p.name} (from URL)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-muted-foreground text-xs leading-snug">
            Requests matching this route will return the dynamic URL value in
            this field.
          </p>
        </div>
      ) : sourceType === "static" ? (
        <div className="space-y-1.5">
          <label
            htmlFor="field-static-val"
            className="text-muted-foreground block text-xs font-bold tracking-wider uppercase"
          >
            Static Value
          </label>
          <Input
            id="field-static-val"
            value={staticValue}
            onChange={(e) => setStaticValue(e.target.value)}
            placeholder='e.g. "active", 100, true'
            variant="mono"
            className="h-8 font-mono text-xs"
            disabled={loading}
          />
          <p className="text-muted-foreground text-xs leading-snug">
            Returns a fixed, hard-coded scalar value on every response.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <span className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
            Mock Data Provider
          </span>
          <FakerProviderSelect
            value={fakerProvider}
            onValueChange={setFakerProvider}
            disabled={
              loading || fieldType === "object" || fieldType === "array"
            }
          />
          {selectedProvider && (
            <p className="text-muted-foreground font-mono text-xs leading-snug">
              Example:{" "}
              <span className="text-foreground">
                {selectedProvider.example}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FieldValueSourceConfig;
