import { NextRequest, NextResponse } from "next/server";
import { deliver, siteUrl } from "@/lib/email/send";
import { fail, POLL_ID, readJson } from "@/lib/polls/http";
import { clientIp, keyedHash } from "@/lib/polls/security";
import { pollStore } from "@/lib/polls/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/**
 * "Report this poll": emails hello@rankamerica.org (forwarded to the organizer) with a link to the
 * poll's Firestore document, where it can be taken down by setting status to "removed".
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!POLL_ID.test(id)) return fail(404, "Poll not found.");
  const body = await readJson(request, 2000);
  if (body instanceof NextResponse) return body;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

  const store = pollStore();
  const ipHash = keyedHash("ip", clientIp(request));
  try {
    const poll = await store.get(id);
    if (!poll || poll.status === "pending" || poll.status === "removed") return fail(404, "Poll not found.");
    if (!await store.hit(`report:${ipHash}`, 5, 24 * 3600_000)) return NextResponse.json({ ok: true }); // quietly drop floods
    const db = process.env.FIRESTORE_DATABASE || "(default)";
    const consoleUrl = `https://console.cloud.google.com/firestore/databases/${encodeURIComponent(db)}/data/panel/polls/${id}?project=ranked-choice-515101`;
    const pollLink = `${siteUrl()}/p/${id}`;
    const text = `A visitor reported a poll.\n\nQuestion: ${poll.question}\nOptions: ${poll.options.map(o => o.label).join(" | ")}\nPoll: ${pollLink}\nReason: ${reason || "(none given)"}\n\nTo take it down, set status to "removed" in Firestore:\n${consoleUrl}\n`;
    const html = `<p>A visitor reported a poll.</p><p><strong>Question:</strong> ${esc(poll.question)}<br><strong>Options:</strong> ${poll.options.map(o => esc(o.label)).join(" | ")}<br><strong>Poll:</strong> <a href="${pollLink}">${pollLink}</a><br><strong>Reason:</strong> ${esc(reason || "(none given)")}</p><p>To take it down, set <code>status</code> to <code>removed</code> in <a href="${consoleUrl}">Firestore</a>.</p>`;
    await deliver("hello@rankamerica.org", { subject: `Poll reported: ${poll.question.slice(0, 80)}`, preheader: "", html, text }, `poll-report/${id}/${ipHash}`);
  } catch (error) {
    console.error(`Report for poll ${id} failed:`, (error as Error).message);
    return fail(503, "We couldn’t send your report. Please try again.");
  }
  return NextResponse.json({ ok: true });
}
