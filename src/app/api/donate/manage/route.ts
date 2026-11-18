import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@/lib/email/send";
import { readManageToken } from "@/lib/email/manage-token";
import { hasDonationConfiguration, portalLoginUrl, stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Manage contribution" link from monthly receipts (?token=…). Portal sessions expire within
 * minutes, so the email carries a long-lived signed token and a fresh session is made per click.
 * GET is safe here: opening the portal changes nothing until the donor acts in it.
 */
export async function GET(request: NextRequest) {
  const site = siteUrl();
  // Bad or expired link: send donors to Stripe's email-code login if configured, else explain on the site.
  const fallback = portalLoginUrl() ?? `${site}/?donation=manage-unavailable#get-involved`;
  const customer = readManageToken(request.nextUrl.searchParams.get("token"));
  if (!customer || !hasDonationConfiguration()) return NextResponse.redirect(fallback, 303);
  try {
    const session = await stripe().billingPortal.sessions.create({ customer, return_url: `${site}/#get-involved` });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Billing portal session failed:", (error as Error).message);
    return NextResponse.redirect(fallback, 303);
  }
}
