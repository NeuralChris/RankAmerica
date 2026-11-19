import "server-only";
import { acceptingVotes, type Poll } from "./model";
import { BALLOTS_PER_IP, type PollStore } from "./store";

/**
 * In-memory store for local development (POLLS_STORE=memory). Mirrors the Firestore store's
 * rules. Data lives on globalThis so it survives dev-server hot reloads, and is lost on restart.
 */
type Ballot = { key: string; notifyEmail: string | null };
type Mem = { polls: Map<string, Poll>; ballots: Map<string, Map<string, Ballot>>; ipCounts: Map<string, number>; hits: Map<string, number> };
const g = globalThis as typeof globalThis & { __pollMem?: Mem };
const mem = () => (g.__pollMem ??= { polls: new Map(), ballots: new Map(), ipCounts: new Map(), hits: new Map() });
const copy = <T,>(v: T): T => structuredClone(v);

export function memoryStore(): PollStore {
  const m = mem();
  return {
    async create(p) { if (m.polls.has(p.id)) throw new Error("exists"); m.polls.set(p.id, copy(p)); m.ballots.set(p.id, new Map()); },
    async get(id) { const p = m.polls.get(id); return p ? copy(p) : null; },
    async publish(id) { const p = m.polls.get(id); if (!p || p.status !== "pending") return false; p.status = "open"; return true; },
    async vote({ pollId, ballotId, key, ipHash, notifyEmail }) {
      const p = m.polls.get(pollId);
      if (!p || p.status === "pending" || p.status === "removed") return "not_found";
      if (!acceptingVotes(p)) return "closed";
      const ballots = m.ballots.get(pollId)!;
      if (ballots.has(ballotId)) return "duplicate";
      const ipKey = `${pollId}:${ipHash}`;
      if ((m.ipCounts.get(ipKey) ?? 0) >= BALLOTS_PER_IP) return "rate_limited";
      ballots.set(ballotId, { key, notifyEmail });
      m.ipCounts.set(ipKey, (m.ipCounts.get(ipKey) ?? 0) + 1);
      p.tally[key] = (p.tally[key] ?? 0) + 1;
      p.ballotCount++;
      return "ok";
    },
    async hasVoted(pollId, ballotId) { return m.ballots.get(pollId)?.has(ballotId) ?? false; },
    async close(id, compute, opts) {
      const p = m.polls.get(id);
      if (!p || p.status !== "open" || (!opts?.force && Date.parse(p.closesAt) > Date.now())) return null;
      p.result = compute(copy(p)); p.status = "closed"; p.notified = false;
      return copy(p);
    },
    async dueForClosing(now) { return [...m.polls.values()].filter(p => p.status === "open" && Date.parse(p.closesAt) <= now.getTime()).map(p => p.id); },
    async awaitingNotification() { return [...m.polls.values()].filter(p => p.status === "closed" && !p.notified).map(p => p.id); },
    async notifyList(pollId) { return [...(m.ballots.get(pollId) ?? new Map<string, Ballot>()).entries()].flatMap(([ballotId, b]) => b.notifyEmail ? [{ ballotId, email: b.notifyEmail }] : []); },
    async markNotified(pollId) {
      for (const b of m.ballots.get(pollId)?.values() ?? []) b.notifyEmail = null;
      const p = m.polls.get(pollId); if (p) p.notified = true;
    },
    async remove(id) { m.polls.delete(id); m.ballots.delete(id); },
    async hit(key, limit, windowMs) {
      const k = `${key}:${Math.floor(Date.now() / windowMs)}`, n = m.hits.get(k) ?? 0;
      if (n >= limit) return false; m.hits.set(k, n + 1); return true;
    },
  };
}
