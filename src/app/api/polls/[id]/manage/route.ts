import { NextRequest, NextResponse } from "next/server";
import { fail, POLL_ID, readJson } from "@/lib/polls/http";
import { keyMatches } from "@/lib/polls/security";
import { closeNow, shareUrl } from "@/lib/polls/service";
import { pollStore } from "@/lib/polls/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creator actions, authorized by the secret key from the manage link (only its hash is stored).
 * Body: { key, action: "publish" | "close" | "delete" }. POST-only so link scanners can't act.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!POLL_ID.test(id)) return fail(404, "Poll not found.");
  const body = await readJson(request, 1000);
  if (body instanceof NextResponse) return body;

  const store = pollStore();
  const poll = await store.get(id).catch(() => null);
  if (!poll || poll.status === "removed" || !keyMatches(body.key, poll.manageKeyHash)) return fail(404, "This manage link isn’t valid.");

  try {
    switch (body.action) {
      case "publish":
        if (Date.parse(poll.closesAt) <= Date.now()) return fail(409, "This poll’s end time has already passed. Create a new poll with a later end time.");
        await store.publish(id);
        return NextResponse.json({ ok: true, shareUrl: shareUrl(id) });
      case "close":
        if (poll.status !== "open") return fail(409, "Only an open poll can be closed.");
        await closeNow(id);
        return NextResponse.json({ ok: true });
      case "delete":
        await store.remove(id);
        return NextResponse.json({ ok: true });
      default:
        return fail(400, "Unknown action.");
    }
  } catch (error) {
    console.error(`Poll ${id} ${String(body.action)} failed:`, (error as Error).message);
    return fail(503, "Something went wrong. Please try again.");
  }
}
