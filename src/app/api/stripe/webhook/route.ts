import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendDonationReceipt, siteUrl } from "@/lib/email/send";
import { createManageToken } from "@/lib/email/manage-token";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Subscribe the endpoint to exactly these events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, invoice.paid,
 *   charge.dispute.created, charge.refunded, radar.early_fraud_warning.created
 * One-time receipts come from the Checkout events; monthly receipts (first and every renewal)
 * come from invoice.paid, so a subscription's first payment is never receipted twice.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        // A delayed payment method completes as "unpaid" first, then sends async_payment_succeeded.
        if (event.data.object.mode === "payment" && event.data.object.payment_status === "paid") await receiptOneTime(event.data.object.id);
        break;
      case "invoice.paid":
        await receiptMonthly(event.data.object);
        break;
      // Nothing is stored locally, so these are logged (IDs only) for follow-up in the Stripe Dashboard.
      case "checkout.session.async_payment_failed":
      case "charge.dispute.created":
      case "charge.refunded":
      case "radar.early_fraud_warning.created":
        console.warn(`Stripe ${event.type}: ${event.data.object.id}`);
        break;
    }
  } catch (error) {
    // Non-2xx makes Stripe retry with backoff. Don't log customer details.
    console.error(`Stripe webhook ${event.type} ${event.id} failed:`, (error as Error).message);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function receiptOneTime(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
  const email = session.customer_details?.email;
  const intent = session.payment_intent as Stripe.PaymentIntent | null;
  const charge = intent?.latest_charge as Stripe.Charge | null | undefined;
  if (!email || !intent || !session.amount_total) throw new Error(`Session ${session.id} is missing email, payment or amount`);
  await sendDonationReceipt(email, {
    name: session.customer_details?.name ?? "",
    amountCents: session.amount_total,
    frequency: "one-time",
    date: new Date((charge?.created ?? session.created) * 1000),
    paymentMethod: describePaymentMethod(charge?.payment_method_details),
    receiptNumber: `RA-${intent.id.slice(-10).toUpperCase()}`,
    statementDescriptor: charge?.calculated_statement_descriptor ?? undefined,
  }, `receipt-${session.id}`);
}

async function receiptMonthly(invoice: Stripe.Invoice) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef || invoice.amount_paid <= 0) return; // not a contribution charge
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;
  const [subscription, payments] = await Promise.all([
    stripe().subscriptions.retrieve(subscriptionId, { expand: ["default_payment_method"] }),
    stripe().invoicePayments.list({ invoice: invoice.id!, status: "paid", expand: ["data.payment.payment_intent.latest_charge"] }),
  ]);
  const intent = payments.data[0]?.payment.payment_intent as Stripe.PaymentIntent | undefined;
  const charge = intent?.latest_charge as Stripe.Charge | null | undefined;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!invoice.customer_email || !customerId) throw new Error(`Invoice ${invoice.id} is missing email or customer`);
  const nextPeriod = subscription.items.data[0]?.current_period_end;
  const paidAt = invoice.status_transitions?.paid_at ?? invoice.created;
  await sendDonationReceipt(invoice.customer_email, {
    name: invoice.customer_name ?? "",
    amountCents: invoice.amount_paid,
    frequency: "monthly",
    date: new Date(paidAt * 1000),
    nextDate: nextPeriod && subscription.status === "active" && !subscription.cancel_at_period_end ? new Date(nextPeriod * 1000) : undefined,
    paymentMethod: describePaymentMethod(charge?.payment_method_details ?? subscription.default_payment_method as Stripe.PaymentMethod | null),
    receiptNumber: invoice.number ?? invoice.id!,
    statementDescriptor: charge?.calculated_statement_descriptor ?? undefined,
    // Without the signing secret the receipt still goes out, just without the self-service link.
    manageUrl: process.env.UNSUBSCRIBE_SECRET ? `${siteUrl()}/api/donate/manage?token=${createManageToken(customerId)}` : undefined,
  }, `receipt-${invoice.id}`);
}

const BRANDS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", diners: "Diners Club", jcb: "JCB", unionpay: "UnionPay" };

/** "Visa ending in 4242", "Apple Pay (Visa ending in 4242)", "Bank account ending in 6789", or a readable method name. */
function describePaymentMethod(pm: { type: string; card?: { brand?: string | null; last4?: string | null; wallet?: { type: string } | null } | null; us_bank_account?: { last4?: string | null } | null } | null | undefined): string {
  if (!pm) return "Card";
  if (pm.card?.last4) {
    const card = `${BRANDS[pm.card.brand ?? ""] ?? "Card"} ending in ${pm.card.last4}`;
    const wallet = pm.card.wallet?.type;
    return wallet ? `${titleCase(wallet)} (${card})` : card;
  }
  if (pm.us_bank_account?.last4) return `Bank account ending in ${pm.us_bank_account.last4}`;
  return titleCase(pm.type);
}

const titleCase = (s: string) => s.split("_").map(w => w === "pay" ? "Pay" : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
