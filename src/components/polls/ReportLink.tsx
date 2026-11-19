"use client";
import { useState } from "react";

/** Small "Report this poll" control: asks for an optional reason and emails the organizer. */
export function ReportLink({ pollId }: { pollId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  async function report() {
    const reason = prompt("What’s wrong with this poll? (optional)");
    if (reason === null) return;
    setState("sending");
    try {
      const res = await fetch(`/api/polls/${pollId}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      setState(res.ok ? "sent" : "error");
    } catch { setState("error"); }
  }
  if (state === "sent") return <p className="poll-report" role="status">Thanks. We’ll take a look.</p>;
  return <p className="poll-report"><button type="button" onClick={report} disabled={state === "sending"}>{state === "error" ? "Report failed. Try again" : "Report this poll"}</button></p>;
}
