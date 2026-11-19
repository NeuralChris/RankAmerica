/**
 * Instant-runoff count for user polls. Pure (no server imports) so the results page,
 * the closing job and tests share it.
 *
 * - Ballots may rank any subset of options; a ballot whose choices are all eliminated
 *   is "exhausted" and stops counting.
 * - A winner needs more than half of the ballots still active in that round.
 * - One option is eliminated per round. Ties for last place are broken by the earlier
 *   round's counts (fewest earlier votes goes), then by a lot drawn deterministically
 *   from the poll ID, so the same poll always produces the same result.
 */
export type CountBallot = { order: string[]; count: number };
export type TieBreak = "earlier-round" | "lot";
export type PollRound = {
  counts: Record<string, number>;
  continuing: string[];
  active: number;
  exhausted: number;
  winner: string | null;
  eliminated: string | null;
  tieBreak: TieBreak | null;
  transferredTo: { id: string; count: number }[];
  /** Ballots that had the eliminated option as top choice and no further continuing choice. */
  newlyExhausted: number;
};

/** Deterministic pseudo-random rank for the lot (FNV-1a over seed + option ID). */
function lot(seed: string, id: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}:${id}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

export function countPoll(optionIds: string[], ballots: CountBallot[], seed = ""): PollRound[] {
  const valid = new Set(optionIds);
  const clean = ballots
    .map(b => ({ order: b.order.filter((id, i) => valid.has(id) && b.order.indexOf(id) === i), count: b.count }))
    .filter(b => b.order.length > 0 && b.count > 0);
  const total = clean.reduce((n, b) => n + b.count, 0);
  let continuing = [...optionIds];
  const rounds: PollRound[] = [];

  while (continuing.length > 0) {
    const counts: Record<string, number> = Object.fromEntries(continuing.map(id => [id, 0]));
    for (const b of clean) {
      const top = b.order.find(id => continuing.includes(id));
      if (top) counts[top] += b.count;
    }
    const active = Object.values(counts).reduce((a, b) => a + b, 0);
    const exhausted = total - active;
    const base = { counts, continuing: [...continuing], active, exhausted, transferredTo: [], newlyExhausted: 0 };

    if (active === 0) { rounds.push({ ...base, winner: null, eliminated: null, tieBreak: null }); break; }
    const majority = continuing.find(id => counts[id] * 2 > active);
    const winner = majority ?? (continuing.length === 1 ? continuing[0] : null);
    if (winner) { rounds.push({ ...base, winner, eliminated: null, tieBreak: null }); break; }

    // Fewest votes is eliminated; break ties by earlier rounds, then by lot.
    const fewest = Math.min(...continuing.map(id => counts[id]));
    let tied = continuing.filter(id => counts[id] === fewest);
    let tieBreak: TieBreak | null = null;
    for (let r = rounds.length - 1; r >= 0 && tied.length > 1; r--) {
      const earlier = Math.min(...tied.map(id => rounds[r].counts[id] ?? 0));
      const narrowed = tied.filter(id => (rounds[r].counts[id] ?? 0) === earlier);
      if (narrowed.length < tied.length) { tied = narrowed; tieBreak = "earlier-round"; }
    }
    if (tied.length > 1) { tied = [tied.sort((a, b) => lot(seed, a) - lot(seed, b))[0]]; tieBreak = "lot"; }
    const eliminated = tied[0];

    const next = continuing.filter(id => id !== eliminated);
    const moved = new Map<string, number>();
    let newlyExhausted = 0;
    for (const b of clean) {
      if (b.order.find(id => continuing.includes(id)) !== eliminated) continue;
      const to = b.order.find(id => next.includes(id));
      if (to) moved.set(to, (moved.get(to) ?? 0) + b.count); else newlyExhausted += b.count;
    }
    const transferredTo = next.filter(id => moved.has(id)).map(id => ({ id, count: moved.get(id)! }));
    rounds.push({ ...base, winner: null, eliminated, tieBreak, transferredTo, newlyExhausted });
    continuing = next;
  }
  return rounds;
}

/** Ballot tallies are stored compactly as { "cab": 3 } (option IDs are single letters). */
export function ballotsFromTally(tally: Record<string, number>): CountBallot[] {
  return Object.entries(tally).map(([key, count]) => ({ order: [...key], count }));
}
