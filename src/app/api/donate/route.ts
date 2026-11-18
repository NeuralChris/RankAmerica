import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { asFrequency, parseAmountCents } from "@/lib/donations";
import { siteUrl } from "@/lib/email/send";
import { isSameOrigin } from "@/lib/same-origin";
import { hasDonationConfiguration, stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Labels these sessions in the Stripe Dashboard (Checkout → integration identifier). */
const INTEGRATION_ID = "rankamerica-donate-qhvmxtra";

/**
 * Starts a Stripe Checkout session for a one-time or monthly contribution and returns its URL.
 * Body: { amount: "25", frequency: "one-time" | "monthly" }. Receipts are sent by the webhook,
 * never from the success page.
 */
export async function POST(request: NextRequest) {
  if (!hasDonationConfiguration()) return NextResponse.json({ error: "Donations are not yet enabled." }, { status: 503 });
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return NextResponse.json({ error: "Invalid request." }, { status: 415 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 1000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const amountCents = parseAmountCents(body?.amount);
  const frequency = asFrequency(body?.frequency);
  if (!amountCents || !frequency) return NextResponse.json({ error: "Please choose an amount between $5 and $10,000." }, { status: 400 });

  const site = siteUrl();
  const monthly = frequency === "monthly";
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: monthly ? "subscription" : "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: amountCents,
        product_data: { name: monthly ? "Monthly contribution to Rank America" : "Contribution to Rank America" },
        ...(monthly ? { recurring: { interval: "month" as const } } : {}),
      },
    }],
    billing_address_collection: "required",
    success_url: `${site}/?donation=thanks#get-involved`,
    cancel_url: `${site}/#get-involved`,
    integration_identifier: INTEGRATION_ID,
    ...(monthly
      ? { subscription_data: { description: "Monthly contribution to Rank America" } }
      : { submit_type: "donate" as const, payment_intent_data: { description: "Contribution to Rank America" } }),
  };

  try {
    const session = await stripe().checkout.sessions.create(params);
    if (!session.url) throw new Error("Checkout session has no URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session failed:", (error as Error).message);
    return NextResponse.json({ error: "We couldn't start checkout. Please try again in a few minutes." }, { status: 503 });
  }
}
