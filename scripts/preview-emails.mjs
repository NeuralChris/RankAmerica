// Renders every email template to .email-previews/ for review in a browser.
//   node --experimental-strip-types scripts/preview-emails.mjs [siteUrl]
// Images load from siteUrl (default https://rankamerica.org; pass http://localhost:3000 for local).
import { mkdirSync, writeFileSync } from "node:fs";
import { welcomeEmail, donationReceiptEmail } from "../src/lib/email/templates.ts";

const siteUrl = (process.argv[2] ?? "https://rankamerica.org").replace(/\/$/, "");
const out = new URL("../.email-previews/", import.meta.url);
mkdirSync(out, { recursive: true });
const donation = { name: "Jordan Lee", amountCents: 2500, date: new Date("2026-11-18T12:00:00Z"), paymentMethod: "Visa ending in 4242", receiptNumber: "RA-1042", siteUrl };
const emails = {
  welcome: welcomeEmail({ name: "Jordan Lee", state: "CO", stateName: "Colorado", unsubscribeUrl: `${siteUrl}/unsubscribe?token=preview`, siteUrl }),
  "donation-monthly": donationReceiptEmail({ ...donation, frequency: "monthly", nextDate: new Date("2026-12-18T12:00:00Z"), manageUrl: "https://billing.stripe.com/p/session/preview" }),
  "donation-one-time": donationReceiptEmail({ ...donation, frequency: "one-time" }),
};
for (const [name, email] of Object.entries(emails)) {
  writeFileSync(new URL(`${name}.html`, out), email.html);
  writeFileSync(new URL(`${name}.txt`, out), `Subject: ${email.subject}\nPreheader: ${email.preheader}\n\n${email.text}`);
}
console.log(`Wrote ${Object.keys(emails).length} previews to .email-previews/`);
