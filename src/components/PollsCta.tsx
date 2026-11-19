/** Homepage band after the demo: invites visitors to run a real ranked-choice poll. */
export function PollsCta() {
  return <section className="polls-cta" aria-labelledby="polls-cta-title"><div className="polls-cta-inner">
    <img src="/assets/icon-ranked-ballot.svg" alt="" width={84} height={84} />
    <div className="polls-cta-text">
      <h2 id="polls-cta-title">Try it with your own question.</h2>
      <p>Team lunch, book club pick, family vacation: create a ranked-choice poll, share the link, and watch the winner emerge round by round.</p>
    </div>
    <a className="btn" href="/polls/new">Create a poll <span className="arrow" aria-hidden="true">→</span></a>
  </div></section>;
}
