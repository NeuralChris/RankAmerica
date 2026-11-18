"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ALL_CANDIDATES, CANDIDATES, DEFAULT_RANKING, countElection, type CandidateId, type Round } from "@/lib/rcv";
const Avatar = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.4" /><path d="M3 22c.3-9.2 17.7-9.2 18 0z" /></svg>;

/**
 * Animated count timeline. Each elimination round plays:
 *   count → eliminate (row turns red) → transfer (ballot chips fly to next choices)
 *   → absorb (recipient bars grow) → exit (eliminated row drops out) → next round.
 * The final round's count step ends the animation on the static winner view.
 */
type Step = "intro" | "count" | "eliminate" | "transfer" | "absorb" | "exit";
type Anim = { round: number; step: Step };
type Flight = { key: string; count: number; color: string; x: number; y: number; dx: number; dy: number; delay: number };
const STEP_MS: Record<Step, number> = { intro: 80, count: 1500, eliminate: 1300, transfer: 1100, absorb: 1300, exit: 550 };
const ELIMINATED_RED = "#d9443b";

function nextStep(a: Anim, rounds: Round[]): Anim | null {
  switch (a.step) {
    case "intro": return { ...a, step: "count" };
    case "count": return rounds[a.round].eliminated ? { ...a, step: "eliminate" } : null;
    case "eliminate": return { ...a, step: "transfer" };
    case "transfer": return { ...a, step: "absorb" };
    case "absorb": return { ...a, step: "exit" };
    case "exit": return { round: a.round + 1, step: "count" };
  }
}
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pct = (n: number, of: number) => Math.round(100 * n / of);

export function BallotDemo() {
  const [ranking, setRanking] = useState<CandidateId[]>([...DEFAULT_RANKING]);
  const [hasRun, setHasRun] = useState(true);
  const [roundIndex, setRoundIndex] = useState(0);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [status, setStatus] = useState("Move the candidates to see a different outcome.");
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const tallyRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<CandidateId, HTMLDivElement>());
  const rowTops = useRef(new Map<CandidateId, number>());

  const rounds = useMemo(() => countElection(ranking), [ranking]);
  const view = anim ? anim.round : Math.min(roundIndex, rounds.length - 1);
  const round = rounds[view];
  const next = rounds[view + 1];
  const step = anim?.step ?? "static";
  const first = rounds[0];
  const last = rounds[rounds.length - 1];
  const plurality = [...ALL_CANDIDATES].sort((a, b) => (first.counts[b] ?? 0) - (first.counts[a] ?? 0))[0];
  const rcvWinner = last.winner ?? [...last.continuing].sort((a, b) => last.counts[b] - last.counts[a])[0];

  // Advance the timeline.
  useEffect(() => {
    if (!anim) return;
    const t = setTimeout(() => {
      const following = nextStep(anim, rounds);
      if (following) { setAnim(following); return; }
      setAnim(null); setRoundIndex(anim.round);
      setStatus("Count complete. Use the round buttons to step back through it.");
    }, STEP_MS[anim.step]);
    return () => clearTimeout(t);
  }, [anim, rounds]);

  // Launch ballot chips from the eliminated bar to each recipient's new bar end.
  useLayoutEffect(() => {
    const tally = tallyRef.current;
    const r = anim && rounds[anim.round], n = anim && rounds[anim.round + 1];
    if (anim?.step !== "transfer" || !tally || !r?.eliminated || !n) { setFlights(f => f.length ? [] : f); return; }
    const box = tally.getBoundingClientRect();
    const point = (id: CandidateId, votes: number, active: number) => {
      const track = rowRefs.current.get(id)?.querySelector(".bartrack")?.getBoundingClientRect();
      return track ? { x: track.left - box.left + track.width * votes / active, y: track.top - box.top + track.height / 2 } : null;
    };
    const from = point(r.eliminated, r.counts[r.eliminated], r.active);
    if (!from) return;
    setFlights(r.transferredTo.flatMap((t, i) => {
      const to = point(t.id, n.counts[t.id], n.active);
      return to ? [{ key: `${anim.round}-${t.id}`, count: t.count, color: CANDIDATES[r.eliminated!].color, x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y, delay: i * 140 }] : [];
    }));
  }, [anim, rounds]);

  // FLIP: slide rows to their new positions when the order changes between rounds.
  useLayoutEffect(() => {
    const reduce = prefersReducedMotion();
    for (const [id, el] of rowRefs.current) {
      const top = el.offsetTop, prev = rowTops.current.get(id);
      if (!reduce && prev !== undefined && prev !== top) {
        el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: "translateY(0)" }], { duration: 500, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
      rowTops.current.set(id, top);
    }
    for (const id of rowTops.current.keys()) if (!rowRefs.current.has(id)) rowTops.current.delete(id);
  });

  function stopAt(i: number) { setAnim(null); setRoundIndex(i); }
  function change(next: CandidateId[]) {
    setRanking(next); setAnim(null); setRoundIndex(0); setHasRun(false);
    setStatus("Ballot updated. Run the count to see the new result.");
  }
  function move(from: number, to: number) {
    if (from < 0 || from >= ranking.length || to < 0 || to >= ranking.length || from === to) return;
    const next = [...ranking]; const [id] = next.splice(from, 1); next.splice(to, 0, id); change(next);
  }
  function runCount() {
    setHasRun(true); setRoundIndex(0);
    if (prefersReducedMotion()) { setAnim(null); setStatus("Count complete. Explore the rounds on the right."); return; }
    setAnim({ round: 0, step: "intro" }); setStatus("Counting the ballots…");
    const panel = resultsRef.current, rect = panel?.getBoundingClientRect();
    if (panel && rect && (rect.top > window.innerHeight * 0.5 || rect.bottom < 0)) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function reset() { setRanking([...DEFAULT_RANKING]); setAnim(null); setHasRun(true); setRoundIndex(0); setStatus("Ballot reset to the sample rankings."); }

  // What the tally shows for the current round/step.
  const draining = step === "transfer" || step === "absorb" || step === "exit";
  const moved = (step === "absorb" || step === "exit") && !!next;
  const outId = step === "static" || step === "eliminate" || draining ? round.eliminated : null;
  const winId = step === "static" ? round.winner : null;
  const shown = moved ? next! : round;
  const rows = [...round.continuing]
    .sort((a, b) => Number(a === round.eliminated) - Number(b === round.eliminated) || round.counts[b] - round.counts[a] || ALL_CANDIDATES.indexOf(a) - ALL_CANDIDATES.indexOf(b))
    .map(id => {
      const isOut = id === outId;
      const votes = moved && !isOut ? shown.counts[id] : round.counts[id];
      const active = moved && !isOut ? shown.active : round.active;
      return {
        id, isOut,
        bar: step === "intro" || (isOut && draining) ? 0 : 100 * votes / active,
        label: isOut && draining ? "moved" : `${votes} (${pct(votes, active)}%)`,
        gain: step === "absorb" ? round.transferredTo.find(t => t.id === id)?.count : undefined,
        className: ["barrow", isOut && "out", isOut && draining && "draining", isOut && step === "exit" && "leaving", id === winId && "win"].filter(Boolean).join(" ")
      };
    });

  const personalVote = ranking.find(id => shown.continuing.includes(id));
  const out = round.eliminated ? CANDIDATES[round.eliminated].name : "";
  const transfers = round.transferredTo.map(t => `${CANDIDATES[t.id].name} +${t.count}`).join(" and ");
  const roundMessage =
    step === "intro" || step === "count" ? <><strong>Round {view + 1}:</strong> Counting each ballot’s top remaining choice. A majority takes {Math.floor(round.active / 2) + 1} of {round.active} votes.</>
    : step === "eliminate" ? <><strong>No majority.</strong> {out} has the fewest votes ({round.counts[round.eliminated!]}) and is eliminated.</>
    : draining ? <><strong>{out}’s {round.counts[round.eliminated!]} ballots move to their next choice:</strong> {transfers}.</>
    : round.winner ? <><strong>{CANDIDATES[round.winner].name} wins.</strong> {round.counts[round.winner]} of {round.active} active ballots ({pct(round.counts[round.winner], round.active)}%) support the winner.</>
    : <><strong>Round {view + 1}:</strong> {out} has the fewest votes ({round.counts[round.eliminated!]}) and is eliminated. Transfers: {transfers}.</>;

  const navButton = anim
    ? <button type="button" onClick={() => stopAt(rounds.length - 1)}>Skip to result ⏭</button>
    : view === rounds.length - 1
      ? <button type="button" onClick={runCount}>Replay count ↻</button>
      : <button type="button" onClick={() => setRoundIndex(i => Math.min(i + 1, rounds.length - 1))}>Next Round →</button>;

  return <section className="demo-section" id="try-it"><div className="container">
    <div className="demo-shell">
      <div className="demo-intro"><div className="mini-eyebrow">Try it yourself</div><h2>See Ranked-Choice<br />Voting in Action.</h2><p>Cast your ranked ballot, run the count, and see how the result compares with our current system.</p><img alt="" className="small-mountains" src="/assets/demo-mountains.png" /></div>
      <div className="panel ballot-panel">
        <div className="panel-label">Your Ballot</div><p className="panel-sub">Rank the candidates in your order of preference. Drag to reorder or use the arrows.</p>
        <div className="ballot-list" aria-label="Rank candidates">
          {ranking.map((id, i) => <div key={id} className={`candidate ${dragOver === i ? "over" : ""}`} draggable onDragStart={e => {dragFrom.current = i; e.dataTransfer.effectAllowed = "move";}} onDragOver={e => {e.preventDefault();setDragOver(i);}} onDragLeave={() => setDragOver(null)} onDrop={e => {e.preventDefault(); if(dragFrom.current !== null) move(dragFrom.current,i); dragFrom.current=null;setDragOver(null);}} onDragEnd={() => {dragFrom.current = null; setDragOver(null);}}>
            <span className="grip" aria-hidden="true">⋮⋮</span><span className="rank">{i + 1}</span>
            <span className="avatar" style={{background:CANDIDATES[id].color}}><Avatar /></span><span className="name">{CANDIDATES[id].name}</span>
            <span className="reorder"><button type="button" aria-label={`Move ${CANDIDATES[id].name} up`} disabled={i === 0} onClick={() => move(i,i-1)}>↑</button><button type="button" aria-label={`Move ${CANDIDATES[id].name} down`} disabled={i === ranking.length-1} onClick={() => move(i,i+1)}>↓</button></span>
          </div>)}
        </div>
        <button className="btn run-button" type="button" onClick={runCount}>Run the Count <span aria-hidden="true" className="arrow">→</span></button>
        <button className="reset" type="button" onClick={reset}>Reset Ballot ↻</button>
        <p className="status" aria-live="polite">{status}</p>
      </div>
      <div className="panel results-panel" ref={resultsRef}>
        <div className="results-top"><div className="panel-label">The Results</div><div role="group" className="round-tabs" aria-label="Election counting rounds">
          {rounds.map((r,i) => <button key={i} type="button" className={i === view && hasRun ? "active" : ""} disabled={!hasRun} aria-pressed={i === view && hasRun} onClick={() => stopAt(i)}>Round {i+1}</button>)}
        </div></div>
        <p className="panel-sub">Your ballot + 18 other fictional voters</p>
        {hasRun ? <>
          <div className="tally" ref={tallyRef}>
            {rows.map(row => <div key={row.id} className={row.className} ref={el => { if (el) rowRefs.current.set(row.id, el); else rowRefs.current.delete(row.id); }}>
              <span className="name">{CANDIDATES[row.id].name}</span>
              <div className="bartrack"><div className="barfill" style={{width:`${row.bar}%`,background:row.isOut ? ELIMINATED_RED : CANDIDATES[row.id].color}} /></div>
              <span className="votes">{row.label}</span>
              {row.gain ? <span className="gain-badge" aria-hidden="true">+{row.gain}</span> : null}
            </div>)}
            {flights.map(f => <span key={f.key} className="vote-chip" aria-hidden="true" style={{left:f.x,top:f.y,borderColor:f.color,animationDelay:`${f.delay}ms`,"--dx":`${f.dx}px`,"--dy":`${f.dy}px`} as CSSProperties}>+{f.count}</span>)}
          </div>
          <div className={`round-explanation ${step === "static" && round.winner ? "winner" : ""}`} aria-live="polite"><span className="info-icon">i</span><span>{roundMessage}</span></div>
          <div className="result-nav"><small>Your ballot counts for {personalVote ? CANDIDATES[personalVote].name : "no candidate"}.</small>{navButton}</div>
          <div className="outcomes"><div className="outcome"><b className="head">Our Current System</b><p>{CANDIDATES[plurality].name} leads with {first.counts[plurality]} of {first.active} first-choice votes ({pct(first.counts[plurality], first.active)}%).</p></div>
            <div className="outcome goldout"><b className="head gold">Ranked-Choice Voting</b><p>{anim ? "Counting the rounds…" : <>{CANDIDATES[rcvWinner].name} wins with {last.counts[rcvWinner]} of {last.active} votes ({pct(last.counts[rcvWinner], last.active)}%) after transfers.</>}</p><img alt="" className="trophy-small" src="/assets/icon-trophy.svg" /></div></div>
        </> : <div className="demo-awaiting"><span aria-hidden="true">↕</span><strong>Your rankings have changed.</strong><p>Click “Run the Count” to calculate the new election results.</p></div>}
      </div>
    </div><p className="demo-note">Illustrative election using fictional candidates. Rankings other than your own stay fixed; actual elections may have different rules for ties, incomplete rankings, or exhausted ballots.</p>
  </div></section>;
}
