import { NextRequest, NextResponse } from "next/server";
import { appendSignup, hasSignupConfiguration } from "@/lib/google-sheets";
import { signupErrors, validateSignup } from "@/lib/validate-signup";
import { sendWelcomeEmail } from "@/lib/email/send";
import { isSameOrigin } from "@/lib/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasSignupConfiguration()) {
    return NextResponse.json({ error: "Signups are not yet enabled." }, { status: 503 });
  }
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/json") || Number(request.headers.get("content-length") || 0) > 12000) {
    return NextResponse.json({ error: "Invalid request." }, { status: 415 });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (typeof body !== "object" || !body) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  const payload = body as Record<string, unknown>;
  if (payload.website) return NextResponse.json({ ok: true }); // hidden honeypot
  const signup = validateSignup(payload);
  if (!signup) return NextResponse.json({ error: "Please fix the highlighted fields.", fields: signupErrors(payload) }, { status: 400 });
  try {
    await appendSignup(signup);
  } catch {
    // Do not log names, email addresses, phone numbers, addresses or request bodies.
    return NextResponse.json({ error: "We couldn't save your signup. Please try again later." }, { status: 503 });
  }
  // The signup is saved; a failed welcome email shouldn't turn that into an error.
  // Awaited (not fire-and-forget) because Cloud Run throttles CPU once the response is sent.
  try { await sendWelcomeEmail(signup); }
  catch (error) { console.error("Welcome email failed:", (error as Error).message); }
  return NextResponse.json({ ok: true });
}
