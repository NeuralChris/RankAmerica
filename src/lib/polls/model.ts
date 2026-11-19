/**
 * Poll data model and validation, shared by the create form (client) and the API (server).
 * Pure module: no server-only imports.
 */
import type { PollRound } from "./count.ts";

/** Option IDs are single letters so a ranking packs into a short key: "cab" = c, then a, then b. */
export const OPTION_IDS = "abcdefghij";
export const LIMITS = {
  questionMax: 200, optionMax: 80, minOptions: 2, maxOptions: OPTION_IDS.length,
  minDurationMs: 60 * 60 * 1000, // polls run at least an hour
  maxDurationMs: 90 * 24 * 60 * 60 * 1000, // and at most 90 days
} as const;

export type ResultsVisibility = "live" | "after_close";
export type PollStatus = "pending" | "open" | "closed" | "removed";
export type PollOption = { id: string; label: string };

export type PollResult = { rounds: PollRound[]; winner: string | null; ballots: number; closedAt: string };

/** What the browser and pages may see. Never includes the creator's email or key hash. */
export type PublicPoll = {
  id: string;
  question: string;
  options: PollOption[];
  closesAt: string; // ISO
  createdAt: string; // ISO
  status: PollStatus;
  resultsVisibility: ResultsVisibility;
  timeZone: string;
  ballotCount: number;
  result: PollResult | null;
};

export type Poll = PublicPoll & {
  creatorEmail: string;
  manageKeyHash: string;
  tally: Record<string, number>;
  notified: boolean;
};

export type NewPollInput = { question: string; options: string[]; closesAt: string; resultsVisibility: ResultsVisibility; creatorEmail: string; timeZone: string };
export type NewPollErrors = Partial<Record<"question" | "options" | "closesAt" | "resultsVisibility" | "creatorEmail", string>>;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max + 1) : "";

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/** Validates a create-poll submission. Returns the cleaned input or field errors. */
export function validateNewPoll(raw: Record<string, unknown>, now = Date.now()): { ok: true; value: NewPollInput } | { ok: false; errors: NewPollErrors } {
  const errors: NewPollErrors = {};
  const question = clean(raw.question, LIMITS.questionMax);
  if (!question) errors.question = "Enter a question.";
  else if (question.length > LIMITS.questionMax) errors.question = `Keep the question under ${LIMITS.questionMax} characters.`;

  const options = (Array.isArray(raw.options) ? raw.options : []).map(o => clean(o, LIMITS.optionMax)).filter(Boolean);
  const lower = options.map(o => o.toLowerCase());
  if (options.length < LIMITS.minOptions) errors.options = `Add at least ${LIMITS.minOptions} options.`;
  else if (options.length > LIMITS.maxOptions) errors.options = `Use at most ${LIMITS.maxOptions} options.`;
  else if (options.some(o => o.length > LIMITS.optionMax)) errors.options = `Keep each option under ${LIMITS.optionMax} characters.`;
  else if (new Set(lower).size !== lower.length) errors.options = "Each option must be different.";

  const closes = typeof raw.closesAt === "string" ? Date.parse(raw.closesAt) : NaN;
  if (!Number.isFinite(closes)) errors.closesAt = "Choose when voting ends.";
  else if (closes < now + LIMITS.minDurationMs) errors.closesAt = "Voting needs to stay open for at least an hour.";
  else if (closes > now + LIMITS.maxDurationMs) errors.closesAt = "Voting can stay open for at most 90 days.";

  const resultsVisibility = raw.resultsVisibility === "live" || raw.resultsVisibility === "after_close" ? raw.resultsVisibility : null;
  if (!resultsVisibility) errors.resultsVisibility = "Choose when results are visible.";

  const creatorEmail = clean(raw.creatorEmail, 254).toLowerCase();
  if (!EMAIL.test(creatorEmail)) errors.creatorEmail = "Enter a valid email address.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: {
    question, options, closesAt: new Date(closes).toISOString(), resultsVisibility: resultsVisibility!, creatorEmail,
    timeZone: isValidTimeZone(raw.timeZone) ? raw.timeZone : "America/New_York",
  } };
}

/** Turns a submitted ranking into its tally key, or null if it isn't a valid partial ranking. */
export function rankingKey(order: unknown, options: PollOption[]): string | null {
  if (!Array.isArray(order) || order.length === 0 || order.length > options.length) return null;
  const ids = new Set(options.map(o => o.id));
  if (!order.every(id => typeof id === "string" && ids.has(id)) || new Set(order).size !== order.length) return null;
  return order.join("");
}

export const isValidEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && EMAIL.test(v.trim());

export function toPublic(p: Poll): PublicPoll {
  const { id, question, options, closesAt, createdAt, status, resultsVisibility, timeZone, ballotCount, result } = p;
  return { id, question, options, closesAt, createdAt, status, resultsVisibility, timeZone, ballotCount, result };
}

/** Results are visible when the poll is closed, or while open if the creator chose live results. */
export const resultsVisible = (p: PublicPoll) => p.status === "closed" || (p.status === "open" && p.resultsVisibility === "live");

/** An open poll whose end time has passed accepts no more votes, even before the closing job runs. */
export const acceptingVotes = (p: PublicPoll, now = Date.now()) => p.status === "open" && Date.parse(p.closesAt) > now;
