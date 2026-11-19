import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { LocalTime } from "@/components/polls/LocalTime";
import { PollShell } from "@/components/polls/PollShell";
import { ReportLink } from "@/components/polls/ReportLink";
import { VoteForm } from "@/components/polls/VoteForm";
import { POLL_ID } from "@/lib/polls/http";
import { acceptingVotes, resultsVisible, type Poll } from "@/lib/polls/model";
import { keyedHash, VOTER_COOKIE } from "@/lib/polls/security";
import { pollStore } from "@/lib/polls/store";

export const dynamic = "force-dynamic";

/** Live (published) polls only; pending and removed polls 404. */
async function loadPoll(id: string): Promise<Poll | null> {
  if (!POLL_ID.test(id)) return null;
  const poll = await pollStore().get(id);
  return poll && (poll.status === "open" || poll.status === "closed") ? poll : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const poll = await loadPoll((await params).id).catch(() => null);
  const title = poll ? `${poll.question} | Ranked-choice poll` : "Poll not found | Rank America";
  const description = poll ? `Rank the options: ${poll.options.map(o => o.label).join(", ")}.` : undefined;
  // Unlisted: shareable by link, but kept out of search engines.
  return { title, description, robots: { index: false, follow: false }, openGraph: { title: poll?.question, description, siteName: "Rank America" } };
}

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = await loadPoll(id);
  if (!poll) notFound();

  const open = acceptingVotes(poll);
  const voterId = (await cookies()).get(VOTER_COOKIE)?.value;
  const alreadyVoted = open && voterId ? await pollStore().hasVoted(id, keyedHash("ballot", `${id}:${voterId}`)) : false;
  const showResults = resultsVisible(poll) || (!open && poll.status === "open"); // past end time, closing job pending

  return <PollShell eyebrow="Ranked-choice poll" title={poll.question}
    intro={<p>{open ? <>Voting ends <LocalTime iso={poll.closesAt} fallbackZone={poll.timeZone} />. </> : "Voting has ended. "}
      {poll.resultsVisibility === "live" ? "Results are live." : open ? "Results are revealed when voting ends." : ""}</p>}>
    {!open ? <div className="panel poll-done">
      <h2>Voting has ended.</h2>
      <p>{poll.status === "closed" ? "The count is in." : "The results are being counted and will be ready in a few minutes."}</p>
      {showResults && poll.status === "closed" && <a className="btn" href={`/p/${id}/results`}>See the results →</a>}
    </div>
    : alreadyVoted ? <div className="panel poll-done">
      <div className="poll-done-icon" aria-hidden="true">✓</div>
      <h2>You’ve already voted.</h2>
      <p>Each browser gets one ballot per poll.</p>
      {poll.resultsVisibility === "live" && <a className="btn" href={`/p/${id}/results`}>See the live count →</a>}
    </div>
    : <VoteForm pollId={id} options={poll.options} liveResults={poll.resultsVisibility === "live"} />}
    <p className="poll-foot">Made with <a href="/polls/new">Rank America polls</a>. Want to run your own? <a href="/polls/new">Create a poll</a>.</p>
    <ReportLink pollId={id} />
  </PollShell>;
}
