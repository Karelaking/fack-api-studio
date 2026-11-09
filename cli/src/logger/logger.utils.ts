import type { SerializedError } from "./logger.types";

const SECRET_KEY =
  /(authorization|token|secret|password|passwd|api[-_]?key|access[-_]?key|private[-_]?key|fack_project_key|fack_token|cookie|set[-_]?cookie|credential)/i;

const SECRET_TEXT: Array<[RegExp, string]> = [
  [/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]"],
  [/((?:FACK_PROJECT_KEY|FACK_TOKEN)\s*[=:]\s*)\S+/gi, "$1[redacted]"],
  [/(--(?:key|token|secret)\s+)\S+/gi, "$1[redacted]"],
];

export function redactText(value: string): string {
  let result = value;
  for (const [pattern, replacement] of SECRET_TEXT) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function redactValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (depth > 6) return "[truncated]";
  if (typeof value === "string") return redactText(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";

  seen.add(value);

  let result: unknown;
  if (Array.isArray(value)) {
    result = value.map((entry) => redactValue(entry, depth + 1, seen));
  } else {
    const record: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      record[key] = SECRET_KEY.test(key)
        ? "[redacted]"
        : redactValue(entry, depth + 1, seen);
    }
    result = record;
  }

  seen.delete(value);
  return result;
}

function formatCause(cause: unknown): string {
  if (typeof cause === "object" && cause !== null) {
    try {
      return redactText(JSON.stringify(redactValue(cause)));
    } catch {
      return "[unserializable cause]";
    }
  }

  return redactText(String(cause));
}

export function serializeError(error: unknown, depth = 0): SerializedError {
  if (error instanceof Error) {
    const code = (error as Error & { code?: unknown }).code;
    const cause = (error as Error & { cause?: unknown }).cause;

    return {
      name: error.name,
      message: redactText(error.message),
      stack: error.stack,
      ...(typeof code === "string" ? { code } : {}),
      ...(cause && depth < 3
        ? {
            cause:
              cause instanceof Error
                ? serializeError(cause, depth + 1)
                : formatCause(cause),
          }
        : {}),
    };
  }

  return { name: "Error", message: redactText(String(error)) };
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) {
    const seconds = ms / 1000;
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
  }

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatClockTime(time: number): string {
  const date = new Date(time);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

export function formatIsoTime(time: number): string {
  return new Date(time).toISOString();
}

export function stripAnsi(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Removes ANSI escapes from strings nested in structured log payloads. */
export function stripAnsiDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return stripAnsi(value);
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((entry) => stripAnsiDeep(entry, depth + 1));
  }

  const record: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    record[key] = stripAnsiDeep(entry, depth + 1);
  }
  return record;
}
