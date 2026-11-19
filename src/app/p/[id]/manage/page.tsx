import type { Metadata } from "next";
import { LocalTime } from "@/components/polls/LocalTime";
import { ManagePanel } from "@/components/polls/ManagePanel";
import { PollShell } from "@/components/polls/PollShell";
import { POLL_ID } from "@/lib/polls/http";
import { keyMatches } from "@/lib/polls/security";
import { resultsUrl, shareUrl } from "@/lib/polls/service";
import { pollStore } from "@/lib/polls/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage your poll | Rank America", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Private creator page, reached from the confirmation email (?key=…). Nothing changes on GET. */
export default async function ManagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ key?: string | string[] }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const key = typeof query.key === "string" ? query.key : "";
  const poll = POLL_ID.test(id) ? await pollStore().get(id) : null;

  if (!poll || poll.status === "removed" || !keyMatches(key, poll.manageKeyHash)) {
    return <PollShell eyebrow="Manage poll" title="This link isn’t valid.">
      <div className="panel poll-done"><p>The poll may have been deleted, or unconfirmed polls are removed after 48 hours.</p><a className="btn" href="/polls/new">Create a poll →</a></div>
    </PollShell>;
  }

  const ballots = poll.status === "open" ? (await pollStore().tally(id)).ballots : poll.ballotCount;
  return <PollShell eyebrow="Manage your poll" title={poll.question}
    intro={<p>{poll.options.length} options · voting {poll.status === "closed" ? "ended" : "ends"} <LocalTime iso={poll.closesAt} fallbackZone={poll.timeZone} /> · results {poll.resultsVisibility === "live" ? "live" : "revealed at the end"}{poll.status !== "pending" ? ` · ${ballots} ${ballots === 1 ? "ballot" : "ballots"} so far` : ""}</p>}>
    <ManagePanel pollId={id} manageKey={key} status={poll.status} shareUrl={shareUrl(id)} resultsUrl={resultsUrl(id)} />
    <p className="poll-foot">Keep this page’s link private: anyone with it can close or delete the poll.</p>
  </PollShell>;
}
