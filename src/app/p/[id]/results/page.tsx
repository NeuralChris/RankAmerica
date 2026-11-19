import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountAnimation } from "@/components/polls/CountAnimation";
import { LocalTime } from "@/components/polls/LocalTime";
import { PollShell } from "@/components/polls/PollShell";
import { POLL_ID } from "@/lib/polls/http";
import { acceptingVotes, resultsVisible } from "@/lib/polls/model";
import { computeResult } from "@/lib/polls/service";
import { pollStore } from "@/lib/polls/store";

export const dynamic = "force-dynamic";

async function load(id: string) {
  if (!POLL_ID.test(id)) return null;
  const poll = await pollStore().get(id);
  return poll && (poll.status === "open" || poll.status === "closed") ? poll : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const poll = await load((await params).id).catch(() => null);
  return { title: poll ? `Results: ${poll.question}` : "Poll not found | Rank America", robots: { index: false, follow: false } };
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = await load(id);
  if (!poll) notFound();
  const open = acceptingVotes(poll);

  if (!resultsVisible(poll)) {
    return <PollShell eyebrow="Ranked-choice poll" title={poll.question}>
      <div className="panel poll-done">
        <h2>Results are hidden until voting ends.</h2>
        <p>{open ? <>Come back after <LocalTime iso={poll.closesAt} fallbackZone={poll.timeZone} /> to watch the count.</> : "Voting has ended. The results are being counted and will be ready in a few minutes."}</p>
        {open && <a className="btn" href={`/p/${id}`}>Go vote →</a>}
      </div>
    </PollShell>;
  }

  const result = poll.status === "closed" && poll.result ? poll.result : computeResult(poll);
  const winner = result.winner ? poll.options.find(o => o.id === result.winner)?.label : null;
  const live = poll.status === "open";
  return <PollShell eyebrow={live ? "Live results" : "Final results"} title={poll.question}
    intro={<p>{live ? <>Voting is open until <LocalTime iso={poll.closesAt} fallbackZone={poll.timeZone} />. {winner ? `${winner} leads right now.` : ""} Refresh to see new ballots.</>
      : winner ? <><strong>{winner} wins.</strong> Watch how the ranked-choice count got there.</> : result.ballots ? "No winner this time." : "No one voted in this poll."}</p>}>
    <CountAnimation options={poll.options} rounds={result.rounds} live={live} />
    {live && <p className="poll-foot"><a href={`/p/${id}`}>Haven’t voted yet? Cast your ballot →</a></p>}
    <p className="poll-foot">Want to run your own? <a href="/polls/new">Create a ranked-choice poll</a>.</p>
  </PollShell>;
}
