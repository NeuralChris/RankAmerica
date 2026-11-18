import "server-only";
import Stripe from "stripe";

/** Donations are on once both Stripe values are set. Use a restricted key (rk_…); README lists its permissions. */
export function hasDonationConfiguration(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Stripe's no-code Customer portal login page (donor enters email, gets a one-time code).
 * Public, not a secret. Fallback for donors without a working receipt link. Unset → no link shown.
 */
export function portalLoginUrl(): string | null {
  const url = process.env.STRIPE_PORTAL_LOGIN_URL;
  return url?.startsWith("https://billing.stripe.com/") ? url : null;
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15_000, appInfo: { name: "rank-america" } });
  return client;
}
