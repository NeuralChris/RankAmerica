import { NextRequest, NextResponse } from "next/server";
import { fail, POLL_ID, readJson } from "@/lib/polls/http";
import { isValidEmail, rankingKey } from "@/lib/polls/model";
import { clientIp, keyedHash, newVoterId, VOTER_COOKIE } from "@/lib/polls/security";
import { pollStore } from "@/lib/polls/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Casts one ballot. One per browser: the ballot's ID is a keyed hash of the poll and a random
 * voter cookie, so a second ballot from the same browser is rejected. Body: { ranking: ["c","a"], notifyEmail? }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!POLL_ID.test(id)) return fail(404, "Poll not found.");
  const body = await readJson(request, 2000);
  if (body instanceof NextResponse) return body;

  const store = pollStore();
  const poll = await store.get(id).catch(() => null);
  if (!poll || poll.status === "pending" || poll.status === "removed") return fail(404, "Poll not found.");
  const key = rankingKey(body.ranking, poll.options);
  if (!key) return fail(400, "Rank at least one option.");
  const wantsEmail = typeof body.notifyEmail === "string" && body.notifyEmail.trim() !== "";
  if (wantsEmail && !isValidEmail(body.notifyEmail)) return fail(400, "That email address doesn’t look quite right.", { fields: { notifyEmail: "That email address doesn’t look quite right." } });

  const existing = request.cookies.get(VOTER_COOKIE)?.value;
  const voterId = existing && /^[\w-]{20,40}$/.test(existing) ? existing : newVoterId();
  let outcome;
  try {
    outcome = await store.vote({
      pollId: id, key, ballotId: keyedHash("ballot", `${id}:${voterId}`), ipHash: keyedHash("ip", clientIp(request)),
      notifyEmail: wantsEmail ? (body.notifyEmail as string).trim().toLowerCase() : null,
    });
  } catch (error) {
    console.error(`Vote on poll ${id} failed:`, (error as Error).message);
    return fail(503, "We couldn’t record your ballot. Please try again.");
  }

  const response = outcome === "ok" ? NextResponse.json({ ok: true })
    : outcome === "duplicate" ? fail(409, "You’ve already voted in this poll from this browser.")
    : outcome === "closed" ? fail(410, "Voting has ended for this poll.")
    : outcome === "rate_limited" ? fail(429, "Too many ballots have come from your network for this poll.")
    : fail(404, "Poll not found.");
  if (voterId !== existing) {
    response.cookies.set(VOTER_COOKIE, voterId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 400 * 24 * 3600 });
  }
  return response;
}
