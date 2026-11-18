"use client";
import { useState, type FormEvent } from "react";
import { STATES, type StateCode, STATE_CODES } from "@/lib/states";
import { DonateCard, type DonationNotice } from "./DonateCard";
import { signupErrors, type SignupErrors, type SignupField } from "@/lib/validate-signup";

type SignupForm = { name: string; email: string; state: string; address: string; phone: string; consent: boolean; website: string };
type Alert = { kind: "error" | "success"; title: string; body: string };
const empty: SignupForm = { name: "", email: "", state: "", address: "", phone: "", consent: false, website: "" };
/** Visual order, used to focus the first field that needs attention. */
const FIELD_ORDER: SignupField[] = ["name", "email", "state", "phone", "address", "consent"];
const fieldId = (field: SignupField) => `signup-${field}`;

const SAVE_FAILED: Alert = { kind: "error", title: "Your signup wasn’t saved.", body: "Something went wrong on our end. Please try again in a few minutes." };
const OFFLINE: Alert = { kind: "error", title: "We couldn’t connect.", body: "Check your internet connection and try again." };
const SIGNED_UP: Alert = { kind: "success", title: "You’re on the list!", body: "Thanks for joining Rank America email updates." };

export function JoinSection({ initialState, signupEnabled, donationsEnabled, donationNotice, manageUrl }: { initialState: StateCode | null; signupEnabled: boolean; donationsEnabled: boolean; donationNotice: DonationNotice; manageUrl: string | null }) {
  const [form, setForm] = useState<SignupForm>({ ...empty, state: initialState ?? "" });
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [alert, setAlert] = useState<Alert | null>(null);
  const disabled = !signupEnabled || sending;

  function patch<K extends keyof SignupForm>(key: K, value: SignupForm[K]) {
    setForm(x => ({ ...x, [key]: value }));
    // Clear a field's error as soon as the visitor starts fixing it.
    if (key in errors) setErrors(e => { const next = { ...e }; delete next[key as SignupField]; return next; });
  }
  function showFieldErrors(found: SignupErrors) {
    setErrors(found);
    const first = FIELD_ORDER.find(f => found[f]);
    if (first) document.getElementById(fieldId(first))?.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    setAlert(null);
    const found = signupErrors(form);
    if (Object.keys(found).length) { showFieldErrors(found); return; }
    setSending(true);
    try {
      let response: Response;
      try { response = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); }
      catch { setAlert(OFFLINE); return; }
      const json = await response.json().catch(() => ({})) as { ok?: boolean; fields?: SignupErrors };
      if (response.ok && json.ok) { setAlert(SIGNED_UP); setErrors({}); setForm({ ...empty, state: form.state }); return; }
      if (response.status === 400 && json.fields && Object.keys(json.fields).length) { showFieldErrors(json.fields); return; }
      setAlert(SAVE_FAILED);
    } finally { setSending(false); }
  }

  /** Props wiring a field to its inline error for styling and screen readers. */
  const describe = (field: SignupField) => errors[field] ? { "aria-invalid": true, "aria-describedby": `${fieldId(field)}-error` } : {};
  const fieldError = (field: SignupField) => errors[field] ? <p className="field-error" id={`${fieldId(field)}-error`}>{errors[field]}</p> : null;

  return <section className="join join-with-form" id="get-involved"><div className="container">
    <div className="join-intro"><div className="mini-eyebrow">Be part of the conversation</div><h2>Join the Movement.</h2><p>Get occasional updates about ranked-choice voting, education, and reform efforts around the country.</p></div>
    <div className="join-panels">
      <div className="signup-card"><div className="form-heading"><div><span className="small-kicker">STAY INFORMED</span><h3>Get email updates</h3></div><span className="form-icon" aria-hidden="true">✉</span></div>
        <p>Join the Rank America email list. State selection helps us organize local updates.</p>
        {!signupEnabled && <p className="setup-message" role="status">Signup preview: submissions are disabled until the Google Sheet connection is configured.</p>}
        <form onSubmit={submit} noValidate>
          <label htmlFor="signup-name">Full name <span>*</span></label><input id="signup-name" autoComplete="name" required maxLength={100} placeholder="Your name" value={form.name} onChange={e => patch("name",e.target.value)} disabled={disabled} {...describe("name")} />{fieldError("name")}
          <div className="signup-row">
            <div><label htmlFor="signup-email">Email <span>*</span></label><input id="signup-email" autoComplete="email" type="email" required placeholder="you@example.com" value={form.email} onChange={e => patch("email",e.target.value)} disabled={disabled} {...describe("email")} />{fieldError("email")}</div>
            <div><label htmlFor="signup-state">State <span>*</span></label><select id="signup-state" required value={form.state} onChange={e => patch("state",e.target.value)} disabled={disabled} {...describe("state")}><option value="">Select state</option>{STATE_CODES.map(code => <option key={code} value={code}>{STATES[code]}</option>)}</select>{fieldError("state")}</div>
          </div>
          <div className="signup-row">
            <div><label htmlFor="signup-phone">Phone <small>(optional)</small></label><input id="signup-phone" autoComplete="tel" type="tel" maxLength={40} placeholder="(555) 000-0000" value={form.phone} onChange={e => patch("phone",e.target.value)} disabled={disabled} {...describe("phone")} />{fieldError("phone")}</div>
            <div><label htmlFor="signup-address">Mailing address <small>(optional)</small></label><input id="signup-address" autoComplete="street-address" maxLength={300} placeholder="Street address" value={form.address} onChange={e => patch("address",e.target.value)} disabled={disabled} {...describe("address")} />{fieldError("address")}</div>
          </div>
          <div className="signup-honeypot" aria-hidden="true"><label htmlFor="signup-website">Website</label><input id="signup-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => patch("website",e.target.value)} /></div>
          <label className={`consent-line ${errors.consent ? "invalid" : ""}`}><input id="signup-consent" type="checkbox" required checked={form.consent} onChange={e => patch("consent",e.target.checked)} disabled={disabled} {...describe("consent")} /><span>I agree to receive emails from Rank America. I can unsubscribe later. <a href="/privacy">Privacy details</a>.</span></label>{fieldError("consent")}
          <button className="btn signup-submit" type="submit" disabled={disabled}>{sending ? "Submitting…" : "Join the email list →"}</button>
          {alert && <div className={`form-alert ${alert.kind}`} role={alert.kind === "error" ? "alert" : "status"}>
            <span className="alert-icon" aria-hidden="true">{alert.kind === "error" ? "!" : "✓"}</span>
            <div><strong>{alert.title}</strong> {alert.body}</div>
          </div>}
        </form>
      </div>
      <DonateCard enabled={donationsEnabled} notice={donationNotice} manageUrl={manageUrl} />
    </div>
    <div className="join-bottom"><a href="https://www.ncsl.org/elections-and-campaigns/ranked-choice-voting" target="_blank" rel="noopener noreferrer">Explore ranked-choice voting ↗</a></div>
  </div></section>;
}
