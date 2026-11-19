"use client";
import { useState, type FormEvent } from "react";
import { LIMITS, type ResultsVisibility } from "@/lib/polls/model";
import { STATES, STATE_CODES } from "@/lib/states";
import { useClientValue } from "./useClientValue";

type Errors = Partial<Record<"question" | "options" | "closesAt" | "resultsVisibility" | "creatorEmail" | "newsletterName" | "newsletterState", string>>;
const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function PollCreateForm() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", ""]);
  // Empty until the visitor edits it; until then the field shows a default a week out.
  const [dateInput, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const defaultDate = useClientValue(() => localDate(new Date(Date.now() + 7 * 864e5)), "");
  const today = useClientValue(() => localDate(new Date()), undefined);
  const date = dateInput || defaultDate;
  const [visibility, setVisibility] = useState<ResultsVisibility>("after_close");
  const [email, setEmail] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const zone = useClientValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone, "");

  const err = (k: keyof Errors) => errors[k] ? <p className="field-error" id={`poll-${k}-error`}>{errors[k]}</p> : null;
  const aria = (k: keyof Errors) => errors[k] ? { "aria-invalid": true, "aria-describedby": `poll-${k}-error` } : {};
  const clear = (k: keyof Errors) => errors[k] && setErrors(e => { const n = { ...e }; delete n[k]; return n; });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    const closes = new Date(`${date}T${time}`);
    const body = {
      question, options: options.map(o => o.trim()).filter(Boolean), closesAt: Number.isFinite(closes.getTime()) ? closes.toISOString() : "",
      resultsVisibility: visibility, creatorEmail: email, timeZone: zone, website,
      ...(subscribe ? { newsletter: { name, state } } : {}),
    };
    setSending(true);
    try {
      const res = await fetch("/api/polls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; fields?: Errors };
      if (res.ok && json.ok) { setSentTo(email.trim()); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (json.fields && Object.keys(json.fields).length) {
        setErrors(json.fields);
        const first = (["question", "options", "closesAt", "creatorEmail", "newsletterName", "newsletterState"] as const).find(k => json.fields![k]);
        if (first) document.getElementById(`poll-${first}`)?.focus();
        return;
      }
      setAlert(json.error ?? "We couldn’t create your poll. Please try again in a few minutes.");
    } catch { setAlert("We couldn’t connect. Check your internet connection and try again."); }
    finally { setSending(false); }
  }

  if (sentTo) return <div className="panel poll-done" role="status">
    <div className="poll-done-icon" aria-hidden="true">✉</div>
    <h2>Check your email to publish your poll.</h2>
    <p>We sent a link to <strong>{sentTo}</strong>. Click it to publish the poll and get your share link. It can take a minute to arrive; check your spam folder if you don’t see it.</p>
    <p className="poll-muted">The same email has your private link for closing the poll early or deleting it, so keep it.</p>
  </div>;

  return <form className="panel poll-create" onSubmit={submit} noValidate>
    <label htmlFor="poll-question">Question</label>
    <input id="poll-question" maxLength={LIMITS.questionMax} placeholder="Where should we go for the team lunch?" value={question} onChange={e => { setQuestion(e.target.value); clear("question"); }} {...aria("question")} />
    {err("question")}

    <fieldset className="poll-options-field">
      <legend>Options <small>(2 to {LIMITS.maxOptions})</small></legend>
      {options.map((o, i) => <div key={i} className="poll-option-row">
        <span className="poll-option-num" aria-hidden="true">{i + 1}</span>
        <input id={i === 0 ? "poll-options" : undefined} aria-label={`Option ${i + 1}`} maxLength={LIMITS.optionMax} placeholder={["Tacos", "Pizza", "Sushi", "Burgers"][i] ?? `Option ${i + 1}`} value={o}
          onChange={e => { setOptions(list => list.map((x, j) => j === i ? e.target.value : x)); clear("options"); }} {...(i === 0 ? aria("options") : {})} />
        {options.length > 2 && <button type="button" className="poll-remove" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions(list => list.filter((_, j) => j !== i))}>✕</button>}
      </div>)}
      {options.length < LIMITS.maxOptions && <button type="button" className="poll-add-option" onClick={() => setOptions(list => [...list, ""])}>+ Add an option</button>}
      {err("options")}
    </fieldset>

    <div className="poll-row">
      <div><label htmlFor="poll-closesAt">Voting ends</label>
        <input id="poll-closesAt" type="date" value={date} min={today} onChange={e => { setDate(e.target.value); clear("closesAt"); }} {...aria("closesAt")} /></div>
      <div><label htmlFor="poll-time">at</label>
        <input id="poll-time" type="time" value={time} onChange={e => { setTime(e.target.value); clear("closesAt"); }} /></div>
    </div>
    <p className="poll-hint">{zone ? `Your time zone: ${zone.replace(/_/g, " ")}. ` : ""}Polls run from 1 hour to 90 days.</p>
    {err("closesAt")}

    <fieldset className="poll-visibility">
      <legend>When can people see results?</legend>
      <label className={visibility === "after_close" ? "selected" : ""}><input type="radio" name="visibility" checked={visibility === "after_close"} onChange={() => setVisibility("after_close")} />
        <span><strong>When voting ends</strong><small>Keeps early results from swaying later voters, like a real election.</small></span></label>
      <label className={visibility === "live" ? "selected" : ""}><input type="radio" name="visibility" checked={visibility === "live"} onChange={() => setVisibility("live")} />
        <span><strong>Live, while voting is open</strong><small>Anyone with the link can watch the count as ballots come in.</small></span></label>
    </fieldset>

    <label htmlFor="poll-creatorEmail">Your email</label>
    <input id="poll-creatorEmail" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); clear("creatorEmail"); }} {...aria("creatorEmail")} />
    <p className="poll-hint">We’ll send a link to publish your poll, then email you the winner when voting ends. It’s never shown to voters.</p>
    {err("creatorEmail")}

    <label className="poll-check"><input type="checkbox" checked={subscribe} onChange={e => setSubscribe(e.target.checked)} /> <span>Also send me occasional Rank America updates about ranked-choice voting</span></label>
    {subscribe && <div className="poll-row poll-newsletter">
      <div><label htmlFor="poll-newsletterName">Full name</label>
        <input id="poll-newsletterName" autoComplete="name" maxLength={100} value={name} onChange={e => { setName(e.target.value); clear("newsletterName"); }} {...aria("newsletterName")} />{err("newsletterName")}</div>
      <div><label htmlFor="poll-newsletterState">State</label>
        <select id="poll-newsletterState" value={state} onChange={e => { setState(e.target.value); clear("newsletterState"); }} {...aria("newsletterState")}>
          <option value="">Select state</option>{STATE_CODES.map(c => <option key={c} value={c}>{STATES[c]}</option>)}
        </select>{err("newsletterState")}</div>
    </div>}

    <div className="signup-honeypot" aria-hidden="true"><label htmlFor="poll-website">Website</label><input id="poll-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
    {alert && <div className="form-alert error" role="alert"><span className="alert-icon" aria-hidden="true">!</span><div>{alert}</div></div>}
    <button className="btn poll-submit" type="submit" disabled={sending}>{sending ? "Creating…" : "Create poll →"}</button>
    <p className="poll-hint poll-center">By creating a poll you agree it follows our <a href="/privacy">privacy policy</a>. Polls are unlisted: only people with the link can find them.</p>
  </form>;
}
