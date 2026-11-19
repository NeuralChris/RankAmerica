import "server-only";
import { deliver, siteUrl } from "../email/send";
import { pollConfirmEmail, pollResultsEmail, type PollResultsSummary } from "../email/templates";
import { ballotsFromTally, countPoll } from "./count";
import { OPTION_IDS, type NewPollInput, type Poll, type PollResult, type PublicPoll } from "./model";
import { newManageKey, newPollId, sha256 } from "./security";
import { pollStore } from "./store";

/** Public share link. SHARE_BASE_URL=https://rankedchoice.vote once that domain points at the site. */
export const shareUrl = (id: string) => `${(process.env.SHARE_BASE_URL || `${siteUrl()}/p`).replace(/\/$/, "")}/${id}`;
export const pollUrl = (id: string) => `${siteUrl()}/p/${id}`;
export const resultsUrl = (id: string) => `${siteUrl()}/p/${id}/results`;
export const manageUrl = (id: string, key: string) => `${siteUrl()}/p/${id}/manage?key=${encodeURIComponent(key)}`;

/** Stores a pending poll and emails the creator the link that publishes it. */
export async function createPoll(input: NewPollInput): Promise<string> {
  const id = newPollId(), key = newManageKey();
  const poll: Poll = {
    id, question: input.question, options: input.options.map((label, i) => ({ id: OPTION_IDS[i], label })),
    closesAt: input.closesAt, createdAt: new Date().toISOString(), status: "pending", resultsVisibility: input.resultsVisibility,
    timeZone: input.timeZone, ballotCount: 0, result: null, creatorEmail: input.creatorEmail, manageKeyHash: sha256(key), tally: {}, notified: false,
  };
  await pollStore().create(poll);
  await deliver(input.creatorEmail, pollConfirmEmail({
    question: poll.question, options: input.options, closesAt: poll.closesAt, timeZone: poll.timeZone,
    live: poll.resultsVisibility === "live", manageUrl: manageUrl(id, key), siteUrl: siteUrl(),
  }), `poll-confirm/${id}`);
  return id;
}

/** Counts the poll's current tally. Used for live results and, at closing, the final result. */
export function computeResult(poll: Pick<Poll, "id" | "options" | "tally" | "ballotCount">): PollResult {
  const rounds = countPoll(poll.options.map(o => o.id), ballotsFromTally(poll.tally), poll.id);
  return { rounds, winner: rounds[rounds.length - 1]?.winner ?? null, ballots: poll.ballotCount, closedAt: new Date().toISOString() };
}

const pct = (n: number, of: number) => (of ? Math.round(100 * n / of) : 0);

/** Plain-language round summary for emails. */
export function summarize(poll: PublicPoll, result: PollResult): Omit<PollResultsSummary, "resultsUrl" | "siteUrl" | "recipient"> {
  const label = (id: string) => poll.options.find(o => o.id === id)?.label ?? id;
  const roundLines = result.ballots ? result.rounds.map((r, i) => {
    const counts = [...r.continuing].sort((a, b) => r.counts[b] - r.counts[a]).map(id => `${label(id)} ${r.counts[id]}`).join(", ");
    const outcome = r.winner ? `${label(r.winner)} wins with a majority.`
      : r.eliminated ? `${label(r.eliminated)} eliminated${r.tieBreak === "lot" ? " (tie broken by lot)" : r.tieBreak === "earlier-round" ? " (tie broken by earlier round)" : ""}.` : "";
    return `Round ${i + 1}: ${counts}. ${outcome}`.trim();
  }) : [];
  const last = result.rounds[result.rounds.length - 1];
  const winningShare = result.winner && last ? `${last.counts[result.winner]} of ${last.active} active ballots (${pct(last.counts[result.winner], last.active)}%)` : null;
  return { question: poll.question, winner: result.winner ? label(result.winner) : null, ballots: result.ballots, roundLines, winningShare };
}

/** Emails the result to the creator and to voters who opted in, then erases the voters' addresses. */
export async function notifyResults(id: string) {
  const store = pollStore(), poll = await store.get(id);
  if (!poll || poll.status !== "closed" || !poll.result || poll.notified) return;
  const base = { ...summarize(poll, poll.result), resultsUrl: resultsUrl(id), siteUrl: siteUrl() };
  await deliver(poll.creatorEmail, pollResultsEmail({ ...base, recipient: "creator" }), `poll-result/${id}/creator`);
  for (const v of await store.notifyList(id)) {
    await deliver(v.email, pollResultsEmail({ ...base, recipient: "voter" }), `poll-result/${id}/${v.ballotId}`);
  }
  await store.markNotified(id);
}

/** Closes one poll now (creator's "close early") and sends the results emails. */
export async function closeNow(id: string) {
  const closed = await pollStore().close(id, computeResult, { force: true });
  if (closed) await notifyResults(id);
  return closed;
}

/** Scheduled job: close polls past their end time, then send any results emails still owed. */
export async function runPollJobs(now = new Date()) {
  const store = pollStore();
  let closed = 0, notified = 0, failed = 0;
  // Each step runs even if the other fails, so a closing problem never holds up owed emails.
  const list = (step: string, fetch: () => Promise<string[]>) => fetch().catch(e => { failed++; console.error(`Poll jobs: listing ${step} failed:`, (e as Error).message); return [] as string[]; });
  for (const id of await list("due polls", () => store.dueForClosing(now))) {
    try { if (await store.close(id, computeResult)) closed++; } catch (e) { failed++; console.error(`Closing poll ${id} failed:`, (e as Error).message); }
  }
  for (const id of await list("unnotified polls", () => store.awaitingNotification())) {
    try { await notifyResults(id); notified++; } catch (e) { failed++; console.error(`Notifying poll ${id} failed:`, (e as Error).message); }
  }
  return { closed, notified, failed };
}
