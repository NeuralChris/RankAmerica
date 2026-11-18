"use client";
import { useState, type FormEvent } from "react";
import { MAX_USD, MIN_USD, PRESET_AMOUNTS_USD, parseAmountCents, type Frequency } from "@/lib/donations";

export type DonationNotice = "thanks" | "manage-unavailable" | null;

const NOTICES = {
  thanks: { kind: "success", title: "Thank you!", body: "Your contribution went through. A receipt is on its way to your inbox." },
  "manage-unavailable": { kind: "error", title: "That link didn’t work.", body: "Reply to your receipt email and we’ll help you change or cancel your contribution." },
} as const;

export function DonateCard({ enabled, notice, manageUrl }: { enabled: boolean; notice: DonationNotice; manageUrl: string | null }) {
  const [frequency, setFrequency] = useState<Frequency>("one-time");
  const [preset, setPreset] = useState<number | null>(25);
  const [custom, setCustom] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !enabled || sending;
  const amount = preset !== null ? String(preset) : custom;
  const valid = parseAmountCents(amount) !== null;
  const shown = notice ? NOTICES[notice] : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    if (!valid) { setError(`Enter an amount between $${MIN_USD} and $${MAX_USD.toLocaleString("en-US")}.`); document.getElementById("donate-custom")?.focus(); return; }
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/donate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, frequency }) });
      const json = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (response.ok && json.url) { window.location.assign(json.url); return; } // stays "sending" while Stripe loads
      setError(json.error ?? "We couldn’t start checkout. Please try again in a few minutes.");
    } catch {
      setError("We couldn’t connect. Check your internet connection and try again.");
    }
    setSending(false);
  }

  return <div className="donation-card"><div className="form-heading"><div><span className="small-kicker">OPTIONAL SUPPORT</span><h3>Support the project</h3></div><span className="form-icon" aria-hidden="true">♡</span></div>
    <p>Want to help support civic education and future site development? Contributions are optional and separate from signing up.</p>
    {shown && <div className={`form-alert ${shown.kind}`} role={shown.kind === "error" ? "alert" : "status"}>
      <span className="alert-icon" aria-hidden="true">{shown.kind === "error" ? "!" : "✓"}</span>
      <div><strong>{shown.title}</strong> {shown.body}</div>
    </div>}
    {!enabled && <p className="setup-message" role="status">Donation preview: checkout is disabled until Stripe is configured.</p>}
    <form className="donate-form" onSubmit={submit} noValidate>
      <fieldset className="donate-frequency" disabled={disabled}>
        <legend className="sr-only">How often</legend>
        {(["one-time", "monthly"] as const).map(f => <label key={f} className={frequency === f ? "selected" : ""}>
          <input type="radio" name="donate-frequency" value={f} checked={frequency === f} onChange={() => setFrequency(f)} />{f === "one-time" ? "One-time" : "Monthly"}
        </label>)}
      </fieldset>
      <fieldset className="donate-amounts" disabled={disabled}>
        <legend className="sr-only">Amount</legend>
        {PRESET_AMOUNTS_USD.map(usd => <label key={usd} className={preset === usd ? "selected" : ""}>
          <input type="radio" name="donate-amount" value={usd} checked={preset === usd} onChange={() => { setPreset(usd); setError(null); }} />${usd}
        </label>)}
        <div className={`donate-custom ${preset === null ? "selected" : ""}`}>
          <span aria-hidden="true">$</span>
          <input id="donate-custom" inputMode="decimal" autoComplete="off" placeholder="Other" aria-label="Other amount in dollars" maxLength={9}
            value={custom} onFocus={() => setPreset(null)} onChange={e => { setPreset(null); setCustom(e.target.value); setError(null); }}
            aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "donate-error" : undefined} />
        </div>
      </fieldset>
      {error && <p className="field-error" id="donate-error">{error}</p>}
      <button className="btn donate-submit" type="submit" disabled={disabled}>
        {sending ? "Opening secure checkout…" : `Contribute${valid ? ` $${Number(amount.replace(/[$,]/g, "")).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : ""}${frequency === "monthly" ? " monthly" : ""} →`}
      </button>
    </form>
    {manageUrl && <p className="donate-manage">Already giving monthly? <a href={manageUrl} target="_blank" rel="noopener noreferrer">Manage your contribution ↗</a></p>}
    <p className="donation-footnote">Payments are processed securely by Stripe; card details never touch this site. Monthly contributions can be changed or cancelled anytime from your receipt. Contributions are not tax-deductible. Verify applicable campaign-finance rules before collecting funds for any ballot campaign.</p>
  </div>;
}
