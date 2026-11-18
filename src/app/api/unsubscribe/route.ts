import { NextRequest, NextResponse } from "next/server";
import { hasSignupConfiguration, markUnsubscribed } from "@/lib/google-sheets";
import { readUnsubscribeToken } from "@/lib/email/unsubscribe-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unsubscribes the person named in a signed token (?token=…). Two callers:
 *  - Mail providers' one-click button (RFC 8058): POST body "List-Unsubscribe=One-Click" → 200.
 *  - The confirm button on /unsubscribe: a form POST → 303 back to that page with the result.
 * Only POST changes anything, so link scanners that prefetch GET URLs can't unsubscribe people.
 */
export async function POST(request: NextRequest) {
  const body = (await request.text().catch(() => "")).slice(0, 2000);
  const oneClick = body.includes("List-Unsubscribe=One-Click");
  const respond = (result: "done" | "invalid" | "error") => oneClick
    ? new NextResponse(result === "done" ? "Unsubscribed" : "Unable to unsubscribe", { status: result === "done" ? 200 : result === "invalid" ? 400 : 503 })
    : new NextResponse(null, { status: 303, headers: { Location: `/unsubscribe?result=${result}` } });

  const who = readUnsubscribeToken(request.nextUrl.searchParams.get("token"));
  if (!who) return respond("invalid");
  if (!hasSignupConfiguration()) return respond("error");
  try {
    await markUnsubscribed(who.email, who.state);
    return respond("done");
  } catch (error) {
    console.error("Unsubscribe failed:", (error as Error).message);
    return respond("error");
  }
}
