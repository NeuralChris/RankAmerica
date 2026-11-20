import type { Metadata } from "next";
import { PollCreateForm } from "@/components/polls/PollCreateForm";
import { PollShell } from "@/components/polls/PollShell";

export const metadata: Metadata = {
  title: "Create a ranked-choice poll | Rank America",
  description: "Ask a question, list the options, and share a link. Voters rank their choices and you get the winner, counted round by round.",
};

export default function NewPollPage() {
  return <PollShell eyebrow="Ranked-choice polls" title="Run your own ranked-choice poll."
    intro={<p>Ask a question, list the options, and share the link. Voters rank their choices, and when voting ends we’ll email you the winner and an animated replay of how it was counted.</p>}>
    <PollCreateForm />
  </PollShell>;
}
