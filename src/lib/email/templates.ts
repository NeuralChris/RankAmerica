/**
 * Email templates (welcome + donation receipt), built from the approved mockups.
 *
 * Email-client-safe HTML: table layout, inline styles, PNG/JPG images at absolute URLs,
 * a "bulletproof" table button, and a plain-text alternative for every message.
 * Pure functions with no server-only imports, so scripts/preview-emails.mjs can render them.
 */
import type { StateCode } from "../states";

export type Email = { subject: string; preheader: string; html: string; text: string };

const C = { navy: "#0a203b", ink: "#091a33", body: "#2d3f59", muted: "#50627e", kicker: "#b23d33", cream: "#fdfaf6", page: "#ece6dd", line: "#e6dccd", gold: "#ffc44b", cta: "#d63c34", footerText: "#b9c6d8", panelText: "#c9d4e3" };
const SANS = "Lato, Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const longDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

// ---------- building blocks ----------

function layout(o: { siteUrl: string; title: string; preheader: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; }
  img { border: 0; outline: none; text-decoration: none; }
  a { color: #1d4f8a; }
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 30px !important; }
    .amount { font-size: 38px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(o.preheader)}${"&#8199;&#847;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${C.cream};border-radius:4px;overflow:hidden;">
    <tr><td align="center" bgcolor="${C.navy}" style="background:${C.navy};padding:28px 0 0;">
      <a href="${o.siteUrl}" style="text-decoration:none;"><img src="${o.siteUrl}/email/logo.png" width="240" height="79" alt="Rank America" style="display:block;width:240px;height:79px;margin:0 auto;"></a>
      <img src="${o.siteUrl}/email/header.jpg" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;margin-top:6px;">
    </td></tr>
    <tr><td class="px" style="padding:40px 48px 44px;font-family:${SANS};color:${C.body};">
${o.body}
    </td></tr>
    <tr><td class="px" align="center" bgcolor="${C.navy}" style="background:${C.navy};padding:30px 48px 34px;font-family:${SANS};text-align:center;">
      <img src="${o.siteUrl}/email/badge.png" width="44" height="44" alt="" style="display:block;width:44px;height:44px;margin:0 auto 12px;">
      <div style="font-size:13px;font-weight:900;letter-spacing:0.06em;color:#ffffff;margin-bottom:10px;">RANK AMERICA</div>
${o.footer}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

const eyebrow = (t: string) => `<div style="font-size:12px;font-weight:900;letter-spacing:0.12em;color:${C.kicker};">${esc(t)}</div>`;
const h1 = (t: string) => `<h1 class="h1" style="margin:12px 0 0;font-family:${SERIF};font-size:36px;line-height:1.12;letter-spacing:-0.02em;color:${C.ink};font-weight:700;">${esc(t)}</h1>`;
const para = (html: string, extra = "") => `<p style="margin:18px 0 0;font-size:16px;line-height:1.6;color:${C.body};${extra}">${html}</p>`;

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td align="center" bgcolor="${C.cta}" style="border-radius:10px;background:${C.cta};">
<a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:16px;font-weight:900;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)} &rarr;</a>
</td></tr></table>`;
}

function ctaPanel(title: string, text: string, label: string, href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:34px;"><tr>
<td align="center" bgcolor="${C.navy}" style="background:${C.navy};border-radius:14px;padding:26px 28px;text-align:center;">
<div style="font-family:${SERIF};font-size:20px;font-weight:700;color:#ffffff;">${esc(title)}</div>
<div style="font-size:14px;line-height:1.5;color:${C.panelText};margin:10px auto 18px;max-width:410px;">${esc(text)}</div>
${button(label, href)}
</td></tr></table>`;
}

const signoff = (closing: string) => para(`${esc(closing)}<br><strong style="color:${C.ink};">The Rank America team</strong>`, "margin-top:32px;");

function footerText(text: string, links: [string, string][]): string {
  const linkHtml = links.map(([label, href]) => `<a href="${href}" style="color:${C.gold};font-weight:700;text-decoration:underline;">${esc(label)}</a>`).join(`<span style="color:${C.footerText};"> &middot; </span>`);
  return `<div style="font-size:12px;line-height:1.6;color:${C.footerText};max-width:420px;margin:0 auto 10px;">${esc(text)}</div>
<div style="font-size:12px;">${linkHtml}</div>`;
}

// ---------- welcome (newsletter signup) ----------

export function welcomeEmail(o: { name: string; state: StateCode; stateName: string; unsubscribeUrl: string; siteUrl: string }): Email {
  const first = firstName(o.name);
  const stateName = o.stateName;
  const subject = `You’re on the list, ${first}`;
  const preheader = "Here’s what to expect from Rank America, and one quick way to see ranked-choice voting in action.";
  const demoUrl = `${o.siteUrl}/#try-it`;

  const feature = (icon: string, title: string, text: string) => `<tr>
<td width="52" valign="top" style="padding:0 16px 18px 0;"><img src="${o.siteUrl}/email/${icon}.png" width="52" height="52" alt="" style="display:block;width:52px;height:52px;"></td>
<td valign="top" style="padding:4px 0 18px;font-family:${SANS};">
<div style="font-size:16px;font-weight:900;color:${C.ink};">${esc(title)}</div>
<div style="font-size:14px;line-height:1.55;color:${C.body};margin-top:3px;">${esc(text)}</div>
</td></tr>`;

  const body = `${eyebrow("WELCOME TO RANK AMERICA")}
${h1(`You’re on the list, ${first}.`)}
${para("Thanks for joining. Rank America is a movement for ranked-choice voting: elections where you rank candidates in order of preference, so you can vote for the person you actually want without worrying about splitting the vote.")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background:#ffffff;border:1px solid ${C.line};border-radius:14px;"><tr>
<td width="56" valign="middle" style="padding:20px 0 20px 22px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="56" height="56" align="center" valign="middle" bgcolor="${C.navy}" style="width:56px;height:56px;border-radius:28px;background:${C.navy};font-family:${SERIF};font-size:20px;font-weight:700;color:${C.gold};">${o.state}</td></tr></table>
</td>
<td valign="middle" style="padding:20px 22px 20px 18px;font-family:${SANS};">
  <div style="font-size:11px;font-weight:900;letter-spacing:0.12em;color:${C.muted};">YOUR STATE</div>
  <div style="font-family:${SERIF};font-size:21px;font-weight:700;color:${C.ink};margin-top:4px;">${esc(stateName)}</div>
  <div style="font-size:14px;line-height:1.5;color:${C.body};margin-top:4px;">You’ll hear about ranked-choice efforts in ${esc(stateName)} (bills, ballot measures and local events) as they come up. Moved? Just reply and let us know.</div>
</td></tr></table>
<h2 style="margin:36px 0 16px;font-family:${SERIF};font-size:22px;font-weight:700;color:${C.ink};">What to expect</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${feature("icon-ranked-ballot", "Occasional updates, never daily", "Clear explainers, news and wins for ranked-choice voting around the country.")}
${feature("icon-transfer", "Easy ways to share the idea", "Most people have never seen a ranked ballot. We’ll give you simple ways to explain it to friends and family.")}
${feature("icon-ballot-box", "A heads-up when it counts", "When there’s a hearing, a petition or a vote that matters in your state, you’ll be among the first to know.")}
</table>
${ctaPanel("Haven’t tried it yet?", "Rank four candidates and watch the votes transfer round by round. It takes about 30 seconds.", "See it in action", demoUrl)}
${signoff("Thanks for being part of this,")}`;

  const footer = footerText("You’re receiving this because you signed up for email updates at rankamerica.org.", [["Unsubscribe", o.unsubscribeUrl], ["Privacy policy", `${o.siteUrl}/privacy`], ["rankamerica.org", o.siteUrl]]);

  const text = `You’re on the list, ${first}.

Thanks for joining. Rank America is a movement for ranked-choice voting: elections where you rank candidates in order of preference, so you can vote for the person you actually want without worrying about splitting the vote.

YOUR STATE: ${stateName}
You’ll hear about ranked-choice efforts in ${stateName} (bills, ballot measures and local events) as they come up. Moved? Just reply and let us know.

WHAT TO EXPECT
- Occasional updates, never daily: clear explainers, news and wins for ranked-choice voting around the country.
- Easy ways to share the idea: simple ways to explain ranked ballots to friends and family.
- A heads-up when it counts: when there’s a hearing, a petition or a vote that matters in your state.

Haven’t tried it yet? Rank four candidates and watch the votes transfer round by round:
${demoUrl}

Thanks for being part of this,
The Rank America team

--
You’re receiving this because you signed up for email updates at rankamerica.org.
Unsubscribe: ${o.unsubscribeUrl}
Privacy policy: ${o.siteUrl}/privacy
`;
  return { subject, preheader, html: layout({ siteUrl: o.siteUrl, title: subject, preheader, body, footer }), text };
}

// ---------- donation receipt ----------

export type Donation = {
  name: string;
  amountCents: number;
  frequency: "monthly" | "one-time";
  date: Date;
  /** Next charge date, for monthly contributions. */
  nextDate?: Date;
  /** e.g. "Visa ending in 4242" */
  paymentMethod: string;
  receiptNumber: string;
  /** Stripe customer-portal link for managing a monthly contribution. */
  manageUrl?: string;
  statementDescriptor?: string;
};

export function donationReceiptEmail(d: Donation & { siteUrl: string }): Email {
  const first = firstName(d.name);
  const monthly = d.frequency === "monthly";
  const amount = usd(d.amountCents);
  const subject = "Thank you for supporting Rank America";
  const preheader = monthly ? `Your ${amount} monthly contribution receipt. Change or cancel anytime.` : `Your receipt for a ${amount} contribution.`;
  const descriptor = d.statementDescriptor ?? "RANKAMERICA.ORG";
  const rows: [string, string][] = [
    ["Date", longDate(d.date)],
    ...(monthly && d.nextDate ? [["Next contribution", longDate(d.nextDate)] as [string, string]] : []),
    ["Payment method", d.paymentMethod],
    ["Paid to", "Rank America"],
    ["On your statement", descriptor],
  ];
  const rowHtml = rows.map(([k, v], i) => `<tr>
<td style="padding:12px 0;font-size:14px;color:${C.muted};${i < rows.length - 1 ? "border-bottom:1px solid #f0e8dc;" : ""}">${esc(k)}</td>
<td align="right" style="padding:12px 0;font-size:14px;font-weight:700;color:${C.ink};${i < rows.length - 1 ? "border-bottom:1px solid #f0e8dc;" : ""}">${esc(v)}</td>
</tr>`).join("\n");
  const manage = monthly && d.manageUrl ? `<tr><td colspan="2" bgcolor="#f7f2ea" style="background:#f7f2ea;padding:14px 24px;font-size:14px;color:${C.body};">
You can change or cancel anytime. <a href="${d.manageUrl}" style="color:#1d4f8a;font-weight:900;">Manage contribution &rarr;</a>
</td></tr>` : "";

  const body = `${eyebrow("THANK YOU")}
${h1(`Thank you, ${first}. You’re helping build a better way to vote.`)}
${para("Your contribution keeps Rank America going: the website, the explainers and the outreach that bring ranked-choice voting to more people.")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background:#ffffff;border:1px solid ${C.line};border-radius:14px;font-family:${SANS};">
<tr><td colspan="2" style="padding:22px 24px 20px;border-bottom:1px dashed #e0d5c5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-size:11px;font-weight:900;letter-spacing:0.12em;color:${C.muted};">RECEIPT</td>
    <td align="right" style="font-size:13px;color:${C.muted};">#${esc(d.receiptNumber)}</td>
  </tr></table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;"><tr>
    <td class="amount" style="font-family:${SERIF};font-size:46px;font-weight:700;line-height:1;color:${C.ink};padding-right:14px;">${amount}</td>
    <td valign="middle"><span style="display:inline-block;background:#fff1cc;color:#6b4a00;border:1px solid #f3d27a;font-size:12px;font-weight:900;letter-spacing:0.04em;padding:5px 10px;border-radius:999px;">${monthly ? "MONTHLY" : "ONE-TIME"}</span></td>
  </tr></table>
</td></tr>
<tr><td colspan="2" style="padding:6px 24px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rowHtml}
</table></td></tr>
${manage}
</table>
<p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:${C.muted};">Rank America is not a registered nonprofit, so contributions are not tax-deductible. Keep this email for your records.</p>
${ctaPanel("Want to do one more thing?", "Share the interactive demo with one friend. Seeing a ranked ballot counted is the fastest way to get it.", "Share Rank America", `${d.siteUrl}/#try-it`)}
${signoff("With gratitude,")}`;

  const footer = footerText("You’re receiving this receipt because you made a contribution at rankamerica.org. Questions about a charge? Just reply to this email.", [["Privacy policy", `${d.siteUrl}/privacy`], ["rankamerica.org", d.siteUrl]]);

  const text = `Thank you, ${first}. You’re helping build a better way to vote.

Your contribution keeps Rank America going: the website, the explainers and the outreach that bring ranked-choice voting to more people.

RECEIPT #${d.receiptNumber}
Amount: ${amount} (${monthly ? "monthly" : "one-time"})
${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}
${monthly && d.manageUrl ? `\nYou can change or cancel anytime: ${d.manageUrl}\n` : ""}
Rank America is not a registered nonprofit, so contributions are not tax-deductible. Keep this email for your records.

Want to do one more thing? Share the interactive demo with one friend:
${d.siteUrl}/#try-it

With gratitude,
The Rank America team

--
You’re receiving this receipt because you made a contribution at rankamerica.org. Questions about a charge? Just reply to this email.
`;
  return { subject, preheader, html: layout({ siteUrl: d.siteUrl, title: subject, preheader, body, footer }), text };
}
