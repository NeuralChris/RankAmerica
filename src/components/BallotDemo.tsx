"use client";
import { useMemo, useRef, useState } from "react";
import { ALL_CANDIDATES, CANDIDATES, DEFAULT_RANKING, countElection, type CandidateId } from "@/lib/rcv";
const Avatar = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.4" /><path d="M3 22c.3-9.2 17.7-9.2 18 0z" /></svg>;
export function BallotDemo() {
  const [ranking, setRanking] = useState<CandidateId[]>([...DEFAULT_RANKING]);
  const [hasRun, setHasRun] = useState(true);
  const [roundIndex, setRoundIndex] = useState(0);
  const [status, setStatus] = useState("Move the candidates to see a different outcome.");
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const rounds = useMemo(() => countElection(ranking), [ranking]);
  const selected = rounds[Math.min(roundIndex, rounds.length - 1)];
  const first = rounds[0];
  const last = rounds[rounds.length - 1];
  const plurality = [...ALL_CANDIDATES].sort((a, b) => (first.counts[b] ?? 0) - (first.counts[a] ?? 0))[0];
  const rcvWinner = last.winner ?? [...last.continuing].sort((a, b) => last.counts[b] - last.counts[a])[0];
  function change(next: CandidateId[]) {
    setRanking(next); setRoundIndex(0); setHasRun(false);
    setStatus("Ballot updated. Run the count to see the new result.");
  }
  function move(from: number, to: number) {
    if (from < 0 || from >= ranking.length || to < 0 || to >= ranking.length || from === to) return;
    const next = [...ranking]; const [id] = next.splice(from, 1); next.splice(to, 0, id); change(next);
  }
  function runCount() { setHasRun(true); setRoundIndex(0); setStatus("Count complete. Explore the rounds on the right."); }
  function reset() { setRanking([...DEFAULT_RANKING]); setHasRun(true); setRoundIndex(0); setStatus("Ballot reset to the sample rankings."); }
  const personalVote = ranking.find(id => selected.continuing.includes(id));
  const roundMessage = selected.winner
    ? <><strong>{CANDIDATES[selected.winner].name} wins.</strong> {selected.counts[selected.winner]} of {selected.active} active ballots ({Math.round(selected.counts[selected.winner] / selected.active * 100)}%) support the winner.</>
    : <><strong>Round {roundIndex + 1}:</strong> {CANDIDATES[selected.eliminated!].name} has the fewest votes ({selected.counts[selected.eliminated!]}) and is eliminated. Transfers: {selected.transferredTo.map(t => `${CANDIDATES[t.id].name} +${t.count}`).join(" and ")}.</>;
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
      <div className="panel results-panel">
        <div className="results-top"><div className="panel-label">The Results</div><div role="group" className="round-tabs" aria-label="Election counting rounds">
          {rounds.map((r,i) => <button key={i} type="button" className={i === roundIndex && hasRun ? "active" : ""} disabled={!hasRun} aria-pressed={i === roundIndex && hasRun} onClick={() => setRoundIndex(i)}>Round {i+1}</button>)}
        </div></div>
        <p className="panel-sub">Your ballot + 18 other fictional voters</p>
        {hasRun ? <>
          <div className="tally" aria-live="polite">{[...selected.continuing].sort((a,b) => selected.counts[b]-selected.counts[a]).map(id => <div key={id} className="barrow"><span className="name">{CANDIDATES[id].name}</span><div className="bartrack"><div className="barfill" style={{width:`${100*selected.counts[id]/selected.active}%`,background:CANDIDATES[id].color}} /></div><span className="votes">{selected.counts[id]} ({Math.round(100*selected.counts[id]/selected.active)}%)</span></div>)}</div>
          <div className={`round-explanation ${selected.winner ? "winner" : ""}`}><span className="info-icon">i</span><span>{roundMessage}</span></div>
          <div className="result-nav"><small>Your ballot counts for {personalVote ? CANDIDATES[personalVote].name : "no candidate"}.</small><button type="button" onClick={() => setRoundIndex(i => Math.min(i+1,rounds.length-1))} disabled={roundIndex === rounds.length-1}>{roundIndex === rounds.length-1 ? "Final result ✓" : "Next Round →"}</button></div>
          <div className="outcomes"><div className="outcome"><b className="head">Our Current System</b><p>{CANDIDATES[plurality].name} leads with {first.counts[plurality]} of {first.active} first-choice votes ({Math.round(100*first.counts[plurality]/first.active)}%).</p></div>
            <div className="outcome goldout"><b className="head gold">Ranked-Choice Voting</b><p>{CANDIDATES[rcvWinner].name} wins with {last.counts[rcvWinner]} of {last.active} votes ({Math.round(100*last.counts[rcvWinner]/last.active)}%) after transfers.</p><img alt="" className="trophy-small" src="/assets/icon-trophy.svg" /></div></div>
        </> : <div className="demo-awaiting"><span aria-hidden="true">↕</span><strong>Your rankings have changed.</strong><p>Click “Run the Count” to calculate the new election results.</p></div>}
      </div>
    </div><p className="demo-note">Illustrative election using fictional candidates. Rankings other than your own stay fixed; actual elections may have different rules for ties, incomplete rankings, or exhausted ballots.</p>
  </div></section>;
}
