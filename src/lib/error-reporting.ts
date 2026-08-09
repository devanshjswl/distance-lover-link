/**
 * Client-side error reporting hook for the root error boundary.
 *
 * Currently just logs to the console with route context. Swap the body of
 * `reportError` for your own telemetry provider (Sentry, PostHog, etc.) if
 * you want production error tracking — no external service is wired up by
 * default so the app has zero third-party runtime dependencies here.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const message = error instanceof Response
    ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
    : error instanceof Error
      ? error.message
      : String(error);
  console.error("[error-boundary]", message, {
    route: window.location.pathname,
    ...context,
    error,
  });
}
