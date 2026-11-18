"use client";
import { useState, type FormEvent } from "react";
import { STATES, type StateCode, STATE_CODES } from "@/lib/states";

type SignupForm = { name: string; email: string; state: string; address: string; phone: string; consent: boolean; website: string };
const empty: SignupForm = { name: "", email: "", state: "", address: "", phone: "", consent: false, website: "" };

export function JoinSection({ initialState, signupEnabled, paypalUrl }: { initialState: StateCode | null; signupEnabled: boolean; paypalUrl: string | null }) {
  const [form, setForm] = useState<SignupForm>({ ...empty, state: initialState ?? "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  function patch<K extends keyof SignupForm>(key: K, value: SignupForm[K]) { setForm(x => ({...x,[key]:value})); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signupEnabled || status === "sending") return;
    setStatus("sending"); setMessage("");
    try {
      const response = await fetch("/api/subscribe", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(form) });
      const json = await response.json() as {ok?: boolean; error?: string};
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Could not submit your request.");
      setStatus("success"); setMessage("Thanks for signing up. We received your request.");
      setForm({...empty,state:form.state});
    } catch(error) {setStatus("error");setMessage(error instanceof Error ? error.message : "Signup failed. Please try again.");}
  }
  return <section className="join join-with-form" id="get-involved"><div className="container">
    <div className="join-intro"><div className="mini-eyebrow">Be part of the conversation</div><h2>Join the Movement.</h2><p>Get occasional updates about ranked-choice voting, education, and reform efforts around the country.</p></div>
    <div className="join-panels">
      <div className="signup-card"><div className="form-heading"><div><span className="small-kicker">STAY INFORMED</span><h3>Get email updates</h3></div><span className="form-icon" aria-hidden="true">✉</span></div>
        <p>Join the Rank America email list. State selection helps us organize local updates.</p>
        {!signupEnabled && <p className="setup-message" role="status">Signup preview: submissions are disabled until the Google Sheet connection and contact email are configured.</p>}
        <form onSubmit={submit}>
          <label htmlFor="signup-name">Full name <span>*</span></label><input id="signup-name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your name" value={form.name} onChange={e => patch("name",e.target.value)} disabled={!signupEnabled || status === "sending"} />
          <div className="signup-row">
            <div><label htmlFor="signup-email">Email <span>*</span></label><input id="signup-email" autoComplete="email" type="email" required placeholder="you@example.com" value={form.email} onChange={e => patch("email",e.target.value)} disabled={!signupEnabled || status === "sending"} /></div>
            <div><label htmlFor="signup-state">State <span>*</span></label><select id="signup-state" required value={form.state} onChange={e => patch("state",e.target.value)} disabled={!signupEnabled || status === "sending"}><option value="">Select state</option>{STATE_CODES.map(code => <option key={code} value={code}>{STATES[code]}</option>)}</select></div>
          </div>
          <div className="signup-row">
            <div><label htmlFor="signup-phone">Phone <small>(optional)</small></label><input id="signup-phone" autoComplete="tel" type="tel" maxLength={40} placeholder="(555) 000-0000" value={form.phone} onChange={e => patch("phone",e.target.value)} disabled={!signupEnabled || status === "sending"} /></div>
            <div><label htmlFor="signup-address">Mailing address <small>(optional)</small></label><input id="signup-address" autoComplete="street-address" maxLength={300} placeholder="Street address" value={form.address} onChange={e => patch("address",e.target.value)} disabled={!signupEnabled || status === "sending"} /></div>
          </div>
          <div className="signup-honeypot" aria-hidden="true"><label htmlFor="signup-website">Website</label><input id="signup-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => patch("website",e.target.value)} /></div>
          <label className="consent-line"><input type="checkbox" required checked={form.consent} onChange={e => patch("consent",e.target.checked)} disabled={!signupEnabled || status === "sending"} /><span>I agree to receive emails from Rank America. I can unsubscribe later. <a href="/privacy">Privacy details</a>.</span></label>
          <button className="btn signup-submit" type="submit" disabled={!signupEnabled || status === "sending"}>{status === "sending" ? "Submitting…" : "Join the email list →"}</button>
          {message && <p className={`form-status ${status}`} role="status">{message}</p>}
        </form>
      </div>
      <div className="donation-card"><div className="form-heading"><div><span className="small-kicker">OPTIONAL SUPPORT</span><h3>Support the project</h3></div><span className="form-icon" aria-hidden="true">♡</span></div>
        <p>Want to help support civic education and future site development? Contributions are optional and separate from signing up.</p>
        <div className="donation-illustration" aria-hidden="true">♡<span>Every voice matters.</span></div>
        {paypalUrl ? <a className="btn paypal-button" href={paypalUrl} target="_blank" rel="noopener noreferrer">Donate securely with PayPal ↗</a> : <div className="setup-message">Donation setup pending. The button activates once a hosted PayPal donation URL is provided.</div>}
        <p className="donation-footnote">Payments will be processed by PayPal. Contributions are not represented as tax-deductible. Verify applicable campaign-finance rules before collecting funds for any ballot campaign.</p>
      </div>
    </div>
    <div className="join-bottom"><a href="https://www.ncsl.org/elections-and-campaigns/ranked-choice-voting" target="_blank" rel="noopener noreferrer">Explore ranked-choice voting ↗</a></div>
  </div></section>;
}
