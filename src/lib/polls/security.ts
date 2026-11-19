import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Short, unguessable poll ID for share links (62^10 ≈ 8×10^17). */
export const newPollId = () => Array.from({ length: 10 }, () => BASE62[randomInt(62)]).join("");
/** Secret for the creator's manage link. Only its SHA-256 is stored. */
export const newManageKey = () => randomBytes(24).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function keyMatches(given: unknown, storedHash: string): boolean {
  if (typeof given !== "string" || given.length > 100) return false;
  const a = Buffer.from(sha256(given)), b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Keyed hash for values we must compare but never store raw (voter cookie IDs, IP addresses).
 * Reuses UNSUBSCRIBE_SECRET with a purpose prefix so hashes for different uses never collide.
 */
export function keyedHash(purpose: string, value: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? (process.env.NODE_ENV === "production" ? null : "local-dev-only-secret");
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not configured.");
  return createHmac("sha256", secret).update(`${purpose}:${value}`).digest("base64url").slice(0, 32);
}

/** Visitor IP as seen by Cloud Run's front end (first X-Forwarded-For hop). */
export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export const VOTER_COOKIE = "ra_voter";
export const newVoterId = () => randomBytes(18).toString("base64url");
