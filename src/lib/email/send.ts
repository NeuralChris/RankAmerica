import "server-only";
import { STATES } from "../states";
import type { Signup } from "../validate-signup";
import { welcomeEmail, type Email } from "./templates";
import { createUnsubscribeToken } from "./unsubscribe-token";

/** Public site origin used for links and images in emails. */
export const siteUrl = () => (process.env.SITE_URL ?? "https://rankamerica.org").replace(/\/$/, "");

/** Email sending is on once Resend and the unsubscribe-link secret are configured. */
export function hasEmailConfiguration(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.UNSUBSCRIBE_SECRET);
}

/** Sends through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email). */
async function send(to: string, email: Email, headers?: Record<string, string>) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
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
