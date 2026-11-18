/**
 * Signed unsubscribe tokens: base64url([email, state]) + "." + HMAC-SHA256 signature.
 * The signature stops anyone from crafting links that unsubscribe other people.
 * Requires UNSUBSCRIBE_SECRET (any long random string) at runtime.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { asStateCode, type StateCode } from "../states.ts";

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createUnsubscribeToken(email: string, state: StateCode, secret = process.env.UNSUBSCRIBE_SECRET): string {
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not configured.");
  const payload = Buffer.from(JSON.stringify([email.trim().toLowerCase(), state])).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readUnsubscribeToken(token: unknown, secret = process.env.UNSUBSCRIBE_SECRET): { email: string; state: StateCode } | null {
  if (!secret || typeof token !== "string" || token.length > 1000) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const [email, rawState] = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const state = asStateCode(rawState);
    return typeof email === "string" && email.includes("@") && state ? { email, state } : null;
  } catch { return null; }
}
