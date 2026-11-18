export const CANDIDATES = {
  j: { name: "Jordan Lee", color: "#8251cd" },
  c: { name: "Casey Rivera", color: "#3d84f5" },
  m: { name: "Morgan Patel", color: "#ffba1d" },
  r: { name: "Riley Brooks", color: "#37b65a" }
} as const;
export type CandidateId = keyof typeof CANDIDATES;
export const ALL_CANDIDATES: CandidateId[] = ["j", "c", "m", "r"];
export type Ballot = { order: CandidateId[]; count: number };
export type Round = {
  counts: Record<string, number>;
  continuing: CandidateId[];
  active: number;
  winner: CandidateId | null;
  eliminated: CandidateId | null;
  transferredTo: { id: CandidateId; count: number }[];
};
const FIXED_BALLOTS: Ballot[] = [
  { order: ["j", "c", "m", "r"], count: 7 },
  { order: ["c", "j", "m", "r"], count: 5 },
  { order: ["m", "j", "c", "r"], count: 2 },
  { order: ["m", "c", "j", "r"], count: 2 },
  { order: ["r", "c", "j", "m"], count: 2 }
];
export const DEFAULT_RANKING: CandidateId[] = ["j", "c", "m", "r"];

/** Simplified instant runoff: deterministic tie-break for educational demos only. */
export function countElection(ownRanking: CandidateId[]): Round[] {
  if (ownRanking.length !== ALL_CANDIDATES.length || new Set(ownRanking).size !== ALL_CANDIDATES.length || ownRanking.some(id => !ALL_CANDIDATES.includes(id))) {
    throw new Error("A sample ballot must rank each fictional candidate exactly once.");
  }
  const ballots: Ballot[] = [...FIXED_BALLOTS, { order: ownRanking, count: 1 }];
  let continuing = [...ALL_CANDIDATES];
  const rounds: Round[] = [];
  while (continuing.length > 0) {
    const counts: Record<string, number> = Object.fromEntries(continuing.map(id => [id, 0]));
    for (const ballot of ballots) {
      const candidate = ballot.order.find(id => continuing.includes(id));
      if (candidate) counts[candidate] += ballot.count;
    }
    const active = Object.values(counts).reduce((a, b) => a + b, 0);
    const winner = continuing.find(id => counts[id] > active / 2) ?? null;
    const eliminated = winner || continuing.length === 1 ? null : [...continuing].sort((a, b) => counts[a] - counts[b] || ALL_CANDIDATES.indexOf(b) - ALL_CANDIDATES.indexOf(a))[0];
    const transferredTo: { id: CandidateId; count: number }[] = [];
    if (eliminated) {
      const next = continuing.filter(id => id !== eliminated);
      for (const id of next) {
        const moved = ballots.reduce((acc, ballot) => {
          const oldTop = ballot.order.find(x => continuing.includes(x));
          const newTop = ballot.order.find(x => next.includes(x));
          return acc + (oldTop === eliminated && newTop === id ? ballot.count : 0);
        }, 0);
        if (moved) transferredTo.push({ id, count: moved });
      }
    }
    rounds.push({ counts, continuing: [...continuing], active, winner, eliminated, transferredTo });
    if (winner || !eliminated) break;
    continuing = continuing.filter(id => id !== eliminated);
  }
  return rounds;
}
