import "server-only";
import { STATES } from "../states";
import type { Signup } from "../validate-signup";
import { donationReceiptEmail, welcomeEmail, type Donation, type Email } from "./templates";
import { createUnsubscribeToken } from "./unsubscribe-token";

/** Public site origin used for links and images in emails. */
export const siteUrl = () => (process.env.SITE_URL ?? "https://rankamerica.org").replace(/\/$/, "");

/** Email sending is on once Resend and the unsubscribe-link secret are configured. */
export function hasEmailConfiguration(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.UNSUBSCRIBE_SECRET);
}

/** Sends through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email). */
async function send(to: string, email: Email, headers?: Record<string, string>, idempotencyKey?: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      // Resend drops a repeat send with the same key (24h), so webhook retries can't double-send.
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Rank America <hello@rankamerica.org>",
      to: [to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
}

/** Welcome email for a new newsletter signup, with one-click unsubscribe headers (RFC 8058). */
export async function sendWelcomeEmail(signup: Signup) {
  if (!hasEmailConfiguration()) return;
  const site = siteUrl();
  const token = createUnsubscribeToken(signup.email, signup.state);
  const email = welcomeEmail({
    name: signup.name,
    state: signup.state,
    stateName: STATES[signup.state],
    unsubscribeUrl: `${site}/unsubscribe?token=${token}`,
    siteUrl: site,
  });
  await send(signup.email, email, {
    "List-Unsubscribe": `<${site}/api/unsubscribe?token=${token}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
}

/**
 * Donation receipt. A send failure throws so the Stripe webhook returns an error and Stripe retries;
 * idempotencyKey (the session or invoice ID) keeps those retries from sending it twice.
 */
export async function sendDonationReceipt(to: string, donation: Donation, idempotencyKey: string) {
  await deliver(to, donationReceiptEmail({ ...donation, siteUrl: siteUrl() }), idempotencyKey);
}

/**
 * Sends a transactional email (receipts, poll emails). A send failure throws so callers can retry;
 * the idempotency key keeps retries from sending twice. Without RESEND_API_KEY the email is saved
 * to .email-previews/ in development and skipped (with a warning) elsewhere.
 */
export async function deliver(to: string, email: Email, idempotencyKey: string) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") return saveLocally(idempotencyKey.replace(/[^\w.-]/g, "_"), email);
    console.warn(`Email skipped (${idempotencyKey.split("/")[0]}): RESEND_API_KEY is not configured.`);
    return;
  }
  await send(to, email, undefined, idempotencyKey);
}

/** Dev only (no Resend key): writes the email to .email-previews/ so local tests can be checked. */
async function saveLocally(name: string, email: Email) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const dir = `${process.cwd()}/.email-previews`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/${name}.html`, email.html);
  await writeFile(`${dir}/${name}.txt`, `Subject: ${email.subject}\n\n${email.text}`);
  console.log(`Dev: email saved to .email-previews/${name}.html (RESEND_API_KEY not set)`);
}
