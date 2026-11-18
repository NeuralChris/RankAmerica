/**
 * Donation amount rules, shared by the donate form (client) and /api/donate (server).
 * Pure module with no server-only imports.
 */
export type Frequency = "one-time" | "monthly";

export const PRESET_AMOUNTS_USD = [10, 25, 50, 100] as const;
/** A $5 floor makes the form less attractive for card testing; the ceiling caps typos. */
export const MIN_USD = 5;
export const MAX_USD = 10_000;

/** Parses a dollar amount ("25", "25.50", "$1,000") into cents, or null if it's outside the allowed range. */
export function parseAmountCents(value: unknown): number | null {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.replace(/[$,\s]/g, "") : "";
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(raw)) return null;
  const cents = Math.round(Number(raw) * 100);
  return cents >= MIN_USD * 100 && cents <= MAX_USD * 100 ? cents : null;
}

export const asFrequency = (value: unknown): Frequency | null => value === "one-time" || value === "monthly" ? value : null;
