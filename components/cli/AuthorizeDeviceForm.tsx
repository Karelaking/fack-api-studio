"use client";

import * as React from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiComputerLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiShieldCheckLine,
  RiTerminalBoxLine,
  RiTimeLine,
} from "@remixicon/react";

import {
  approveDevice,
  denyDevice,
  inspectDeviceCode,
  type DeviceRequestSummary,
} from "@/app/cli/authorize/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthorizeDeviceCardFrame } from "./AuthorizeDeviceCardFrame";
import { AuthorizeDeviceRow } from "./AuthorizeDeviceRow";

type Phase =
  | "idle"
  | "checking"
  | "review"
  | "approving"
  | "denying"
  | "approved"
  | "denied";

function formatCode(raw: string): string {
  const clean = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

function isComplete(code: string): boolean {
  return code.replace(/-/g, "").length === 8;
}

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

function statusFromRequest(request: DeviceRequestSummary): {
  phase: Phase;
  error?: string;
} {
  if (request.status === "approved" || request.status === "consumed") {
    return { phase: "approved" };
  }
  if (request.status === "denied") {
    return { phase: "denied" };
  }
  if (request.isExpired) {
    return {
      phase: "idle",
      error:
        "That code expired before it was approved. Run `fack login` again.",
    };
  }
  return { phase: "review" };
}

export interface AuthorizeDeviceFormProps {
  initialCode?: string;
}

/**
 * The one interactive surface on /cli/authorize: verify a terminal code,
 * inspect the requester, then approve or deny it. The terminal keeps polling,
 * so the approved state only needs to tell the developer to return to it.
 */
export function AuthorizeDeviceForm({
  initialCode,
}: AuthorizeDeviceFormProps): React.JSX.Element {
  const [code, setCode] = React.useState(() => formatCode(initialCode ?? ""));
  const [request, setRequest] = React.useState<DeviceRequestSummary | null>(
    null,
  );
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const autoChecked = React.useRef(false);

  const busy =
    phase === "checking" || phase === "approving" || phase === "denying";
  const complete = isComplete(code);
  const showReview =
    Boolean(request) &&
    (phase === "review" || phase === "approving" || phase === "denying");

  const inspect = React.useCallback(async (value: string): Promise<void> => {
    setPhase("checking");
    setError(null);
    try {
      const result = await inspectDeviceCode(value);
      if (!result.ok || !result.request) {
        setRequest(null);
        setPhase("idle");
        setError(result.error ?? "That code is not valid.");
        return;
      }

      setRequest(result.request);
      const next = statusFromRequest(result.request);
      setPhase(next.phase);
      setError(next.error ?? null);
    } catch {
      setRequest(null);
      setPhase("idle");
      setError(
        "Couldn't reach Fack Studio. Check your connection and try again.",
      );
    }
  }, []);

  React.useEffect((): (() => void) | void => {
    if (autoChecked.current) return;
    autoChecked.current = true;
    const formatted = formatCode(initialCode ?? "");
    if (isComplete(formatted)) {
      const timer = setTimeout(() => {
        void inspect(formatted);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialCode, inspect]);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (busy || !complete) return;
    await inspect(code);
  }

  async function onApprove(): Promise<void> {
    if (!request || busy) return;
    setPhase("approving");
    setError(null);
    try {
      const result = await approveDevice(request.userCode);
      if (!result.ok || !result.request) {
        setPhase("review");
        setError(result.error ?? "Couldn't authorize this terminal.");
        return;
      }
      setRequest(result.request);
      setPhase("approved");
    } catch {
      setPhase("review");
      setError("Couldn't authorize this terminal. Try again.");
    }
  }

  async function onDeny(): Promise<void> {
    if (!request || busy) return;
    setPhase("denying");
    setError(null);
    try {
      const result = await denyDevice(request.userCode);
      if (!result.ok || !result.request) {
        setPhase("review");
        setError(result.error ?? "Couldn't deny this request.");
        return;
      }
      setRequest(result.request);
      setPhase("denied");
    } catch {
      setPhase("review");
      setError("Couldn't deny this request. Try again.");
    }
  }

  if (phase === "approved") {
    return (
      <AuthorizeDeviceCardFrame>
        <div className="flex flex-col items-center text-center">
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <RiShieldCheckLine className="size-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading mt-5 text-xl font-semibold tracking-tight">
            Terminal authorized
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
            Return to the terminal where you ran{" "}
            <code className="bg-muted text-caption rounded-sm px-1 py-0.5 font-mono">
              fack login
            </code>
            . It continues on its own — you can close this tab.
          </p>
          <div className="border-border/60 bg-muted/30 mt-6 w-full rounded-lg border px-4 py-3 text-left">
            <p className="text-muted-foreground text-mini font-mono font-semibold tracking-[0.18em] uppercase">
              Next in your terminal
            </p>
            <code className="mt-1.5 block font-mono text-sm">
              fack projects
            </code>
          </div>
        </div>
      </AuthorizeDeviceCardFrame>
    );
  }

  if (phase === "denied") {
    return (
      <AuthorizeDeviceCardFrame>
        <div className="flex flex-col items-center text-center">
          <span className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
            <RiCloseLine className="size-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading mt-5 text-xl font-semibold tracking-tight">
            Request denied
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
            The terminal stops waiting. No credential was issued. Run{" "}
            <code className="bg-muted text-caption rounded-sm px-1 py-0.5 font-mono">
              fack login
            </code>{" "}
            again if you change your mind.
          </p>
        </div>
      </AuthorizeDeviceCardFrame>
    );
  }

  return (
    <AuthorizeDeviceCardFrame>
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-mini font-mono font-semibold tracking-[0.2em] uppercase">
          Terminal access
        </p>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Authorize Fack CLI
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Confirm the code shown in your terminal. Approving lets it list
          projects and pull encrypted bundles as you.
        </p>
      </div>

      <form
        onSubmit={(event) => void onSubmit(event)}
        className="mt-6 flex flex-col gap-2"
      >
        <label
          htmlFor="device-code"
          className="text-foreground text-xs font-medium"
        >
          Code from your terminal
        </label>
        <Input
          id="device-code"
          value={code}
          onChange={(event) => {
            setCode(formatCode(event.target.value));
            if (phase === "review") {
              setRequest(null);
              setPhase("idle");
            }
            setError(null);
          }}
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "device-code-error" : undefined}
          disabled={busy}
          className={cn(
            "h-12 text-center font-mono text-lg tracking-[0.32em] uppercase",
            "placeholder:tracking-[0.32em]",
          )}
        />
        {error ? (
          <p
            id="device-code-error"
            role="alert"
            className="text-destructive flex items-start gap-1.5 text-xs leading-relaxed"
          >
            <RiErrorWarningLine
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {error}
          </p>
        ) : null}
      </form>

      {showReview && request ? (
        <div className="mt-6">
          <dl className="border-border/60 divide-border/60 divide-y rounded-lg border">
            <AuthorizeDeviceRow
              icon={<RiComputerLine />}
              label="Device"
              value={request.deviceName}
            />
            <AuthorizeDeviceRow
              icon={<RiTerminalBoxLine />}
              label="Platform"
              value={request.platform}
            />
            <AuthorizeDeviceRow
              icon={<RiTimeLine />}
              label="Requested"
              value={relativeTime(request.createdAt)}
            />
          </dl>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Only approve if you just ran{" "}
            <code className="font-mono">fack login</code> and the details above
            match your machine.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        {showReview ? (
          <>
            <Button
              type="button"
              onClick={() => void onApprove()}
              disabled={busy}
              className="h-10 w-full"
            >
              {phase === "approving" ? (
                <RiLoader4Line className="animate-spin" aria-hidden="true" />
              ) : (
                <RiCheckLine aria-hidden="true" />
              )}
              Authorize terminal
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void onDeny()}
              disabled={busy}
              className="h-10 w-full"
            >
              {phase === "denying" ? (
                <RiLoader4Line className="animate-spin" aria-hidden="true" />
              ) : (
                <RiCloseLine aria-hidden="true" />
              )}
              Deny
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={() => void inspect(code)}
            disabled={busy || !complete}
            className="h-10 w-full"
          >
            {busy ? (
              <RiLoader4Line className="animate-spin" aria-hidden="true" />
            ) : null}
            Continue
          </Button>
        )}
      </div>

      <p className="text-muted-foreground border-border/60 mt-6 border-t pt-4 text-xs leading-relaxed">
        Codes come from <code className="font-mono">fack login</code> in the
        repository you want to connect. They expire after ten minutes.
      </p>
    </AuthorizeDeviceCardFrame>
  );
}
