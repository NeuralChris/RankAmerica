"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { PollOption } from "@/lib/polls/model";
import { OPTION_COLORS } from "./CountAnimation";

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

export function VoteForm({ pollId, options, liveResults }: { pollId: string; options: PollOption[]; liveResults: boolean }) {
  const [ranking, setRanking] = useState<string[]>([]);
  const [notify, setNotify] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"voted" | "already" | null>(null);
  const label = (id: string) => options.find(o => o.id === id)!.label;
  const dot = (id: string) => <span className="poll-dot" style={{ background: OPTION_COLORS[options.findIndex(o => o.id === id) % OPTION_COLORS.length] }} aria-hidden="true" />;
  const unranked = options.filter(o => !ranking.includes(o.id));

  function move(from: number, to: number) {
    if (to < 0 || to >= ranking.length) return;
    const next = [...ranking]; const [id] = next.splice(from, 1); next.splice(to, 0, id); setRanking(next);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ranking.length) { setError("Tap at least one option to rank it."); return; }
    if (notify && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address, or uncheck the box."); document.getElementById("poll-notify-email")?.focus(); return; }
    setError(null); setSending(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ranking, notifyEmail: notify ? email.trim() : "" }) });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) setDone("voted");
      else if (res.status === 409) setDone("already");
      else setError(json.error ?? "We couldn’t record your ballot. Please try again.");
    } catch { setError("We couldn’t connect. Check your internet connection and try again."); }
    finally { setSending(false); }
  }

  if (done) return <div className="panel poll-done" role="status">
    <div className="poll-done-icon" aria-hidden="true">✓</div>
    <h2>{done === "voted" ? "Your ballot is in." : "You’ve already voted."}</h2>
    <p>{done === "voted" ? (notify ? "We’ll email you the winner when voting ends." : "Thanks for ranking!") : "Each browser gets one ballot per poll."}</p>
    <div className="poll-done-actions">
      {liveResults && <a className="btn" href={`/p/${pollId}/results`}>See the live count →</a>}
      <Link className="poll-link" href="/#get-involved">Want updates about ranked-choice voting? Join the email list</Link>
    </div>
  </div>;

  return <form className="panel poll-vote" onSubmit={submit} noValidate>
    <div className="panel-label">Your Ballot</div>
    <p className="panel-sub">Tap options in order of preference. Rank as many or as few as you like.</p>

    {ranking.length > 0 && <ol className="poll-ranked" aria-label="Your ranking">
      {ranking.map((id, i) => <li key={id} className="candidate">
        <span className="rank">{ordinal(i + 1)}</span>{dot(id)}<span className="name">{label(id)}</span>
        <span className="reorder">
          <button type="button" aria-label={`Move ${label(id)} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
          <button type="button" aria-label={`Move ${label(id)} down`} disabled={i === ranking.length - 1} onClick={() => move(i, i + 1)}>↓</button>
          <button type="button" aria-label={`Remove ${label(id)} from your ranking`} onClick={() => setRanking(r => r.filter(x => x !== id))}>✕</button>
        </span>
      </li>)}
    </ol>}

    {unranked.length > 0 && <div className="poll-unranked">
      <div className="poll-unranked-label">{ranking.length ? `Tap to add as your ${ordinal(ranking.length + 1)} choice` : "Tap your 1st choice"}</div>
      {unranked.map(o => <button key={o.id} type="button" className="poll-option" onClick={() => { setRanking(r => [...r, o.id]); setError(null); }}>
        {dot(o.id)}<span>{o.label}</span><span className="poll-add" aria-hidden="true">+</span>
      </button>)}
    </div>}

    <label className="poll-check"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /> <span>Email me the winner when voting ends</span></label>
    {notify && <div className="poll-notify">
      <label htmlFor="poll-notify-email" className="sr-only">Your email</label>
      <input id="poll-notify-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} />
      <small>Used only for this one email, then deleted. <a href="/privacy">Privacy</a></small>
    </div>}

    {error && <p className="field-error poll-error" role="alert">{error}</p>}
    <button className="btn poll-submit" type="submit" disabled={sending}>{sending ? "Casting your ballot…" : "Cast my ballot →"}</button>
  </form>;
}
