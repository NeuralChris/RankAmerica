/**
 * Signed "manage your monthly contribution" tokens for receipt emails:
 * base64url(stripeCustomerId) + "." + HMAC-SHA256 signature.
 * Reuses UNSUBSCRIBE_SECRET with a distinct prefix, so an unsubscribe signature can never
 * be replayed as a manage signature (or the reverse).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(`donation-manage:${payload}`).digest("base64url");

export function createManageToken(customerId: string, secret = process.env.UNSUBSCRIBE_SECRET): string {
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not configured.");
  const payload = Buffer.from(customerId).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readManageToken(token: unknown, secret = process.env.UNSUBSCRIBE_SECRET): string | null {
  if (!secret || typeof token !== "string" || token.length > 500) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const customerId = Buffer.from(payload, "base64url").toString("utf8");
  return /^cus_[A-Za-z0-9]+$/.test(customerId) ? customerId : null;
}
