import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/send";
import { appendSignup, hasSignupConfiguration } from "@/lib/google-sheets";
import { fail, readJson } from "@/lib/polls/http";
import { validateNewPoll } from "@/lib/polls/model";
import { clientIp, keyedHash } from "@/lib/polls/security";
import { createPoll } from "@/lib/polls/service";
import { pollStore } from "@/lib/polls/store";
import { signupErrors, validateSignup } from "@/lib/validate-signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREATES_PER_IP_PER_DAY = 10;

/**
 * Creates a pending poll and emails the creator a link to publish it. The response deliberately
 * doesn't include the poll's link: a poll only goes live after its creator proves the email works.
 * Body: { question, options[], closesAt, resultsVisibility, creatorEmail, timeZone,
 *         newsletter?: { name, state } (opt-in, also adds them to the email list) }
 */
export async function POST(request: NextRequest) {
  const body = await readJson(request, 8000);
  if (body instanceof NextResponse) return body;
  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const parsed = validateNewPoll(body);
  const news = body.newsletter && typeof body.newsletter === "object" ? body.newsletter as Record<string, unknown> : null;
  const signupInput = news ? { name: news.name, email: body.creatorEmail, state: news.state, consent: true } : null;
  const newsErrors = signupInput ? signupErrors(signupInput) : {};
  const fields = { ...(parsed.ok ? {} : parsed.errors), ...(newsErrors.name ? { newsletterName: newsErrors.name } : {}), ...(newsErrors.state ? { newsletterState: newsErrors.state } : {}) };
  if (!parsed.ok || Object.keys(fields).length) return fail(400, "Please fix the highlighted fields.", { fields });

  try {
    if (!await pollStore().hit(`create:${keyedHash("ip", clientIp(request))}`, CREATES_PER_IP_PER_DAY, 24 * 3600_000)) {
      return fail(429, "You’ve created a lot of polls today. Please try again tomorrow.");
    }
    await createPoll(parsed.value);
  } catch (error) {
    console.error("Poll creation failed:", (error as Error).message);
    return fail(503, "We couldn’t create your poll. Please try again in a few minutes.");
  }

  // Optional newsletter opt-in. The poll is already created, so a failure here doesn't fail the request.
  const signup = signupInput && validateSignup(signupInput);
  if (signup && hasSignupConfiguration()) {
    try { await appendSignup(signup, "Rank America website (poll)"); await sendWelcomeEmail(signup); }
    catch (error) { console.error("Poll newsletter signup failed:", (error as Error).message); }
  }
  return NextResponse.json({ ok: true });
}
