"use client";
import { useClientValue } from "./useClientValue";

const fmt = (iso: string, timeZone?: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone }).format(new Date(iso));

/**
 * Shows a date in the viewer's own time zone. The server renders the poll creator's zone
 * (so the first paint is meaningful), then the browser swaps in its local time.
 */
export function LocalTime({ iso, fallbackZone }: { iso: string; fallbackZone: string }) {
  const text = useClientValue(() => fmt(iso), fmt(iso, fallbackZone));
  return <time dateTime={iso}>{text}</time>;
}
