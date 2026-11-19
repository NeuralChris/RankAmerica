import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "../same-origin";

export const fail = (status: number, error: string, extra?: Record<string, unknown>) => NextResponse.json({ error, ...extra }, { status });

/**
 * Parses a same-origin JSON POST body of at most maxBytes. Returns the object, or a ready-made
 * error response (wrong content type, cross-site, too large, malformed).
 */
export async function readJson(request: NextRequest, maxBytes: number): Promise<Record<string, unknown> | NextResponse> {
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return fail(415, "Invalid request.");
  if (!isSameOrigin(request)) return fail(403, "Origin not allowed.");
  try {
    const raw = await request.text();
    if (raw.length > maxBytes) return fail(413, "Request too large.");
    const body = JSON.parse(raw);
    return body && typeof body === "object" && !Array.isArray(body) ? body : fail(400, "Invalid request.");
  } catch { return fail(400, "Invalid JSON."); }
}

export const POLL_ID = /^[0-9A-Za-z]{10}$/;
