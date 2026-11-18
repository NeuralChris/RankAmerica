"use client";
import { useState } from "react";
const entries = [
  { question: "Do I have to rank every candidate?", answer: "Usually, no. If you rank only a few candidates and all of them are eliminated, your ballot becomes exhausted and stops counting in later rounds. The exact rules depend on the jurisdiction." },
  { question: "Does ranking a second choice hurt my first choice?", answer: "No. In the single-winner instant-runoff format shown here, your ballot counts for your highest-ranked candidate still in the race. A second choice only receives your vote after higher-ranked choices are eliminated." },
  { question: "Will this end the two-party system?", answer: "Not necessarily. Ranked-choice voting can reduce some spoiler incentives and broaden voter choice, but single-winner districts still create significant advantages for major parties." },
  { question: "Does this remove big money from politics?", answer: "No. The way votes are counted and how campaigns are financed are separate issues. RCV may change incentives for candidates and voters, but contribution and spending rules remain the same unless separately reformed." }
];
export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return <section className="faq" id="faq"><div className="container faq-inner">
    <div><div className="mini-eyebrow" style={{color:"#ef5a52"}}>Quick answers</div><h2>Questions worth asking.</h2><p>Understanding the tradeoffs is part of understanding the reform.</p></div>
    <div>{entries.map((entry, i) => <div className={`question ${open === i ? "open" : ""}`} key={entry.question}>
      <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{entry.question}<span>{open === i ? "−" : "+"}</span></button><div className="answer">{entry.answer}</div>
    </div>)}</div>
  </div></section>;
}
