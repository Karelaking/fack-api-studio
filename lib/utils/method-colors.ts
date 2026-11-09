/**
 * Shared tint grammar for HTTP method and response-status chips.
 *
 * Every surface that renders a method or status chip imports these helpers
 * instead of re-declaring a palette map, so a token change propagates in one
 * place. The grammar is the documented one: a 10% tint of the hue, the hue as
 * text, and a 25% hue border. Hues are fixed by `DESIGN.md` (GET green, POST
 * blue, PUT amber, PATCH orange, DELETE red) and never follow the theme's
 * accent.
 */

const METHOD_BADGE_CLASSES: Record<string, string> = {
  GET: "bg-method-get/10 text-method-get border-method-get/25",
  POST: "bg-method-post/10 text-method-post border-method-post/25",
  PUT: "bg-method-put/10 text-method-put border-method-put/25",
  PATCH: "bg-method-patch/10 text-method-patch border-method-patch/25",
  DELETE: "bg-method-delete/10 text-method-delete border-method-delete/25",
};

const NEUTRAL_BADGE = "bg-muted text-muted-foreground border-border/40";

/** Tinted chip classes for an HTTP method; unknown verbs fall back to muted. */
export function getMethodBadgeClass(method: string): string {
  return METHOD_BADGE_CLASSES[method.toUpperCase()] ?? NEUTRAL_BADGE;
}

/**
 * Tinted chip classes for a response class. Matches `DESIGN.md`: green 2xx,
 * amber 3xx, red 4xx/5xx, muted unknown.
 */
export function getStatusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "bg-success/10 text-success border-success/25";
  }
  if (status >= 300 && status < 400) {
    return "bg-warning/10 text-warning border-warning/25";
  }
  if (status >= 400) {
    return "bg-danger/10 text-danger border-danger/25";
  }
  return NEUTRAL_BADGE;
}

/**
 * Latency chips stay tinted rather than filled: slow calls should read as a
 * warning without becoming a solid block of colour in the log stream.
 */
export function getLatencyBadgeClass(latencyMs: number): string {
  if (latencyMs > 1000) {
    return "bg-danger/5 text-danger border-danger/10";
  }
  if (latencyMs > 200) {
    return "bg-warning/5 text-warning border-warning/10";
  }
  return "bg-success/5 text-success border-success/10";
}
