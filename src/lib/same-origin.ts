import type { NextRequest } from "next/server";

/**
 * Rejects cross-site form posts. Compares the browser's Origin host with the host the
 * request was addressed to. request.nextUrl.origin can't be used: behind Cloud Run (or
 * any TLS-terminating proxy) it reflects the container's internal http://0.0.0.0:8080.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients; JSON content type already forces a CORS preflight cross-site
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try { return Boolean(host) && new URL(origin).host === host; } catch { return false; }
}
