import "server-only";
import type { Poll, PollResult } from "./model";
import { firestoreStore } from "./firestore-store";
import { memoryStore } from "./memory-store";

export type VoteOutcome = "ok" | "duplicate" | "closed" | "not_found" | "rate_limited";
export type VoteInput = { pollId: string; ballotId: string; key: string; ipHash: string; notifyEmail: string | null };

export interface PollStore {
  create(poll: Poll): Promise<void>;
  get(id: string): Promise<Poll | null>;
  /** pending → open. False if the poll isn't pending. */
  publish(id: string): Promise<boolean>;
  vote(input: VoteInput): Promise<VoteOutcome>;
  hasVoted(pollId: string, ballotId: string): Promise<boolean>;
  /**
   * Closes an open poll whose end time has passed (or any open poll when force is set),
   * storing the computed result. Returns the closed poll, or null if it isn't closable.
   */
  close(id: string, compute: (poll: Poll) => PollResult, opts?: { force?: boolean }): Promise<Poll | null>;
  dueForClosing(now: Date): Promise<string[]>;
  awaitingNotification(): Promise<string[]>;
  /** Voters who asked to be emailed the result. */
  notifyList(pollId: string): Promise<{ ballotId: string; email: string }[]>;
  /** Marks results emails sent and erases the voters' email addresses. */
  markNotified(pollId: string): Promise<void>;
  /** Deletes the poll and all its ballots. */
  remove(id: string): Promise<void>;
  /** Fixed-window rate limit. True if this hit is allowed. */
  hit(key: string, limit: number, windowMs: number): Promise<boolean>;
}

/** Most ballots one IP address may cast in one poll (households and offices share an IP). */
export const BALLOTS_PER_IP = 25;
/** How long data is kept: unconfirmed polls 48 hours, everything else a year after closing. */
export const RETENTION = { pendingMs: 48 * 3600_000, afterCloseMs: 365 * 24 * 3600_000 } as const;

/** Firestore in production; in-memory when POLLS_STORE=memory (local development without cloud credentials). */
export function pollStore(): PollStore {
  return process.env.POLLS_STORE === "memory" ? memoryStore() : firestoreStore();
}
