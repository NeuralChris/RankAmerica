"use client";
import { useState } from "react";
import type { PollStatus } from "@/lib/polls/model";

/** Creator controls behind the private manage link: publish, copy share link, close early, delete. */
export function ManagePanel({ pollId, manageKey, status, shareUrl, resultsUrl }: { pollId: string; manageKey: string; status: PollStatus; shareUrl: string; resultsUrl: string }) {
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function act(action: "publish" | "close" | "delete") {
    if (action === "close" && !confirm("Close voting now? Results will be counted and emailed right away.")) return;
    if (action === "delete" && !confirm("Delete this poll and all its ballots? This can’t be undone.")) return;
    setBusy(action); setError(null);
    try {
      const res = await fetch(`/api/polls/${pollId}/manage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: manageKey, action }) });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) { setError(json.error ?? "Something went wrong. Please try again."); return; }
      setCurrent(action === "publish" ? "open" : action === "close" ? "closed" : "removed");
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setBusy(null); }
  }
  const link = current === "closed" ? resultsUrl : shareUrl;
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the link stays selectable */ }
  }

  if (current === "removed") return <div className="panel poll-done" role="status"><h2>Poll deleted.</h2><p>The poll and all its ballots have been removed.</p><a className="btn" href="/polls/new">Create another poll →</a></div>;

  return <div className="panel poll-manage">
    {current === "pending" ? <>
      <div className="panel-label">Ready to publish</div>
      <p className="panel-sub">Publishing makes the poll live. Anyone with the link can then vote.</p>
      <button className="btn poll-submit" type="button" disabled={!!busy} onClick={() => act("publish")}>{busy === "publish" ? "Publishing…" : "Publish poll →"}</button>
    </> : <>
      <div className="panel-label">{current === "open" ? "Your poll is live" : "Voting has ended"}</div>
      <p className="panel-sub">{current === "open" ? "Share this link with voters:" : "Share the results:"}</p>
      <div className="poll-share">
        <input readOnly value={link} onFocus={e => e.target.select()} aria-label="Share link" />
        <button type="button" className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <div className="poll-manage-links">
        <a href={`/p/${pollId}`}>View poll</a>
        <a href={`/p/${pollId}/results`}>Results</a>
      </div>
      {current === "open" && <button type="button" className="poll-secondary" disabled={!!busy} onClick={() => act("close")}>{busy === "close" ? "Closing…" : "Close voting now"}</button>}
    </>}
    {error && <p className="field-error poll-error" role="alert">{error}</p>}
    <button type="button" className="poll-danger" disabled={!!busy} onClick={() => act("delete")}>{busy === "delete" ? "Deleting…" : "Delete poll"}</button>
  </div>;
}
