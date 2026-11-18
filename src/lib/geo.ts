import { asStateCode, type StateCode } from "./states";

/**
 * IP lookup is handled by the hosting platform, not by GPS or browser permissions.
 * Vercel provides region headers automatically on deployment; local development
 * normally returns null. Do NOT treat this as a verified mailing address.
 */
export function getStateFromHeaders(headers: Headers): StateCode | null {
  const country = headers.get("x-vercel-ip-country");
  if (country !== "US") return null;
  return asStateCode(headers.get("x-vercel-ip-country-region"));
}

/** QA-only preview override, e.g. /?state=CO. Does not assert an IP location. */
export function chooseDisplayedState(
  headers: Headers,
  preview: string | string[] | undefined
): { state: StateCode | null; source: "preview" | "ip" | "fallback" } {
  const requested = asStateCode(preview);
  if (requested) return { state: requested, source: "preview" };
  const fromIp = getStateFromHeaders(headers);
  return fromIp ? { state: fromIp, source: "ip" } : { state: null, source: "fallback" };
}
