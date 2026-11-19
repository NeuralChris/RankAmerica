"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { PollRound } from "@/lib/polls/count";
import type { PollOption } from "@/lib/polls/model";

/**
 * Animated round-by-round count for a real poll, using the homepage demo's tally styles.
 * Each elimination round plays: count → eliminate → transfer (chips fly to next choices) →
 * absorb (recipient bars grow) → exit (eliminated row drops out) → next round.
 */
type Step = "intro" | "count" | "eliminate" | "transfer" | "absorb" | "exit";
type Anim = { round: number; step: Step };
type Flight = { key: string; count: number; color: string; x: number; y: number; dx: number; dy: number; delay: number };
const STEP_MS: Record<Step, number> = { intro: 80, count: 1500, eliminate: 1300, transfer: 1100, absorb: 1300, exit: 550 };
const ELIMINATED_RED = "#d9443b";
export const OPTION_COLORS = ["#8251cd", "#3d84f5", "#f0a400", "#37b65a", "#f2584f", "#18a9a9", "#d94f95", "#8a6d3b", "#5b6b8c", "#8fb83a"];

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pct = (n: number, of: number) => (of ? Math.round(100 * n / of) : 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function nextStep(a: Anim, rounds: PollRound[]): Anim | null {
  switch (a.step) {
    case "intro": return { ...a, step: "count" };
    case "count": return rounds[a.round].eliminated ? { ...a, step: "eliminate" } : null;
    case "eliminate": return { ...a, step: "transfer" };
    case "transfer": return { ...a, step: "absorb" };
    case "absorb": return { ...a, step: "exit" };
    case "exit": return a.round + 1 < rounds.length ? { round: a.round + 1, step: "count" } : null;
  }
}

/** live: voting is still open, so the leader "would win" rather than "wins". */
export function CountAnimation({ options, rounds, autoplay = true, live = false }: { options: PollOption[]; rounds: PollRound[]; autoplay?: boolean; live?: boolean }) {
  const [roundIndex, setRoundIndex] = useState(rounds.length - 1);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const tallyRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const rowTops = useRef(new Map<string, number>());
  const color = (id: string) => OPTION_COLORS[Math.max(0, options.findIndex(o => o.id === id)) % OPTION_COLORS.length];
  const label = (id: string) => options.find(o => o.id === id)?.label ?? id;

  const play = () => { if (reduceMotion()) { setAnim(null); setRoundIndex(rounds.length - 1); } else setAnim({ round: 0, step: "intro" }); };
  // Start the reveal once on mount.
  useEffect(() => {
    if (!autoplay || !rounds.length || rounds[0].active === 0) return;
    const t = setTimeout(play, 400); // let the page settle before the reveal
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!anim) return;
    const t = setTimeout(() => {
      const following = nextStep(anim, rounds);
      if (following) setAnim(following); else { setAnim(null); setRoundIndex(anim.round); }
    }, STEP_MS[anim.step]);
    return () => clearTimeout(t);
  }, [anim, rounds]);

  useLayoutEffect(() => {
    const tally = tallyRef.current;
    const r = anim && rounds[anim.round], n = anim && rounds[anim.round + 1];
    if (anim?.step !== "transfer" || !tally || !r?.eliminated || !n) { setFlights(f => f.length ? [] : f); return; }
    const box = tally.getBoundingClientRect();
    const point = (id: string, votes: number, active: number) => {
      const track = rowRefs.current.get(id)?.querySelector(".bartrack")?.getBoundingClientRect();
      return track ? { x: track.left - box.left + track.width * (active ? votes / active : 0), y: track.top - box.top + track.height / 2 } : null;
    };
    const from = point(r.eliminated, r.counts[r.eliminated], r.active);
    if (!from) return;
    setFlights(r.transferredTo.flatMap((t, i) => {
      const to = point(t.id, n.counts[t.id], n.active);
      return to ? [{ key: `${anim.round}-${t.id}`, count: t.count, color: color(r.eliminated!), x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y, delay: i * 140 }] : [];
    }));
  }, [anim, rounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // FLIP: slide rows to their new order between rounds.
  useLayoutEffect(() => {
    const reduce = reduceMotion();
    for (const [id, el] of rowRefs.current) {
      const top = el.offsetTop, prev = rowTops.current.get(id);
      if (!reduce && prev !== undefined && prev !== top) el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: "translateY(0)" }], { duration: 500, easing: "cubic-bezier(.2,.7,.2,1)" });
      rowTops.current.set(id, top);
    }
    for (const id of rowTops.current.keys()) if (!rowRefs.current.has(id)) rowTops.current.delete(id);
  });

  if (!rounds.length || rounds[0].active === 0) return <div className="panel poll-results-panel"><p className="poll-empty">No ballots have been cast yet.</p></div>;

  const view = anim ? anim.round : Math.min(roundIndex, rounds.length - 1);
  const round = rounds[view], next = rounds[view + 1];
  const step = anim?.step ?? "static";
  const draining = step === "transfer" || step === "absorb" || step === "exit";
  const moved = (step === "absorb" || step === "exit") && !!next;
  const outId = step === "static" || step === "eliminate" || draining ? round.eliminated : null;
  const winId = step === "static" ? round.winner : null;
  const shown = moved ? next! : round;
  const order = options.map(o => o.id);
  const rows = [...round.continuing]
    .sort((a, b) => Number(a === round.eliminated) - Number(b === round.eliminated) || round.counts[b] - round.counts[a] || order.indexOf(a) - order.indexOf(b))
    .map(id => {
      const isOut = id === outId;
      const votes = moved && !isOut ? shown.counts[id] : round.counts[id];
      const active = moved && !isOut ? shown.active : round.active;
      return {
        id, isOut,
        bar: step === "intro" || (isOut && draining) ? 0 : 100 * votes / Math.max(active, 1),
        label: isOut && draining ? "moved" : `${votes} (${pct(votes, active)}%)`,
        gain: step === "absorb" ? round.transferredTo.find(t => t.id === id)?.count : undefined,
        className: ["barrow", isOut && "out", isOut && draining && "draining", isOut && step === "exit" && "leaving", id === winId && "win"].filter(Boolean).join(" "),
      };
    });

  const out = round.eliminated ? label(round.eliminated) : "";
  const tie = round.tieBreak === "lot" ? " (tied for last; settled by lot)" : round.tieBreak === "earlier-round" ? " (tied for last; settled by the earlier round)" : "";
  const transfers = round.transferredTo.map(t => `${label(t.id)} +${t.count}`).join(", ");
  const exhaustedNote = round.newlyExhausted ? ` ${plural(round.newlyExhausted, "ballot ranked", "ballots ranked")} no one else and ${round.newlyExhausted === 1 ? "stops" : "stop"} counting.` : "";
  const message =
    step === "intro" || step === "count" ? <><strong>Round {view + 1}:</strong> Counting each ballot’s top remaining choice. A majority takes {Math.floor(round.active / 2) + 1} of {round.active} active ballots.</>
    : step === "eliminate" ? <><strong>No majority.</strong> {out} has the fewest votes ({round.counts[round.eliminated!]}) and is eliminated{tie}.</>
    : draining ? <><strong>{out}’s ballots move to their next choice:</strong> {transfers || "none"}.{exhaustedNote}</>
    : round.winner ? <><strong>{label(round.winner)} {live ? "would win if voting ended now" : "wins"}</strong> with {round.counts[round.winner]} of {round.active} active ballots ({pct(round.counts[round.winner], round.active)}%){round.exhausted ? `. ${plural(round.exhausted, "ballot", "ballots")} ran out of ranked choices` : ""}.</>
    : <><strong>Round {view + 1}:</strong> {out} has the fewest votes and is eliminated{tie}. Transfers: {transfers || "none"}.{exhaustedNote}</>;

  const navButton = anim
    ? <button type="button" onClick={() => { setAnim(null); setRoundIndex(rounds.length - 1); }}>Skip to result ⏭</button>
    : view === rounds.length - 1
      ? <button type="button" onClick={play}>Replay count ↻</button>
      : <button type="button" onClick={() => setRoundIndex(i => Math.min(i + 1, rounds.length - 1))}>Next round →</button>;

  return <div className="panel poll-results-panel">
    <div className="results-top"><div className="panel-label">The Count</div>
      <div role="group" className="round-tabs" aria-label="Counting rounds">
        {rounds.map((_, i) => <button key={i} type="button" className={i === view ? "active" : ""} aria-pressed={i === view} onClick={() => { setAnim(null); setRoundIndex(i); }}>Round {i + 1}</button>)}
      </div>
    </div>
    {/* Height fits every option from round 1, so the panel doesn’t shrink as rows drop out. */}
    <div className="tally" ref={tallyRef} style={{ minHeight: rounds[0].continuing.length * 34 }}>
      {rows.map(row => <div key={row.id} className={row.className} ref={el => { if (el) rowRefs.current.set(row.id, el); else rowRefs.current.delete(row.id); }}>
        <span className="name">{label(row.id)}</span>
        <div className="bartrack"><div className="barfill" style={{ width: `${row.bar}%`, background: row.isOut ? ELIMINATED_RED : color(row.id) }} /></div>
        <span className="votes">{row.label}</span>
        {row.gain ? <span className="gain-badge" aria-hidden="true">+{row.gain}</span> : null}
      </div>)}
      {flights.map(f => <span key={f.key} className="vote-chip" aria-hidden="true" style={{ left: f.x, top: f.y, borderColor: f.color, animationDelay: `${f.delay}ms`, "--dx": `${f.dx}px`, "--dy": `${f.dy}px` } as CSSProperties}>+{f.count}</span>)}
    </div>
    <div className={`round-explanation ${step === "static" && round.winner ? "winner" : ""}`} aria-live="polite"><span className="info-icon">i</span><span>{message}</span></div>
    <div className="result-nav"><small>{plural(rounds[0].active, "ballot", "ballots")} counted</small>{navButton}</div>
  </div>;
}
