import { asStateCode, type StateCode } from "./states";

/**
 * IP lookup is handled by the hosting platform, not by GPS or browser permissions.
 * Vercel provides region headers automatically on deployment; local development
 * normally returns null. Do NOT treat this as a verified mailing address.
 */
export function getStateFromHeaders(headers: Headers): StateCode | null {
  // Vercel
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry) return vercelCountry === "US" ? asStateCode(headers.get("x-vercel-ip-country-region")) : null;

  // Google Cloud external HTTPS load balancer in front of Cloud Run, configured with
  // custom request headers X-Client-Region: {client_region} and
  // X-Client-Subdivision: {client_region_subdivision} (CLDR IDs like "USCA").
  if (headers.get("x-client-region") !== "US") return null;
  const subdivision = headers.get("x-client-subdivision")?.trim().toUpperCase();
  return subdivision?.startsWith("US") ? asStateCode(subdivision.slice(2)) : null;
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
