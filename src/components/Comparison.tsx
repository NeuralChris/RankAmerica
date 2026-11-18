export function Comparison() {
  return (
    <section className="problem" id="problem">
      <div className="container">
        <div className="comparison" id="better">
          <article className="comparison-card old-card">
            <div className="icon-disc"><img alt="" src="/assets/icon-ballot-box.svg" /></div>
            <div className="card-copy">
              <h2>Our Current Voting System</h2>
              <ul className="check-list">
                <li><span className="bubble" aria-hidden="true">×</span>Can elect a winner without majority support.</li>
                <li><span className="bubble" aria-hidden="true">×</span>Can pressure voters to choose strategically rather than vote for their favorite.</li>
                <li><span className="bubble" aria-hidden="true">×</span>Can split support among similar candidates and reinforce two-party competition.</li>
              </ul>
            </div>
          </article>
          <article className="comparison-card new-card">
            <div className="icon-disc"><img alt="" src="/assets/icon-ranked-ballot.svg" /></div>
            <div className="card-copy">
              <h2>Ranked-Choice Voting</h2>
              <ul className="check-list">
                <li><span className="bubble" aria-hidden="true">✓</span>Rank candidates in the order you prefer.</li>
                <li><span className="bubble" aria-hidden="true">✓</span>If your top choice is eliminated, your vote can count for your next remaining choice.</li>
                <li><span className="bubble" aria-hidden="true">✓</span>Can reduce spoiler pressure and reward broader support.</li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
