import { getHero, STATES, type StateCode } from "@/lib/states";

export function Hero({ state, source }: { state: StateCode | null; source: "preview" | "ip" | "fallback" }) {
  const artwork = getHero(state);
  return (
    <section className="hero" id="top">
      <div
        role="img"
        aria-label={artwork.alt}
        className="hero-photo"
        style={{ backgroundImage: `linear-gradient(90deg,#09213de8 0%,#09213dcd 24%,#09213d39 48%,#09213d0a 75%), url('${artwork.src}')` }}
      />
      <div className="container">
        <div className="hero-copy">
          <div className="location-label" aria-label="Regional edition">{state ? `${STATES[state]} edition` : "A nationwide movement"}{source === "preview" ? " · Preview" : ""}</div>
          <h1>Our Current Voting<br />System Is <em>Holding Us Back.</em></h1>
          <p>Today, you pick one candidate, and whoever gets the most votes wins—even if most voters preferred someone else.</p>
          <p><span className="highlight">Ranked-choice voting</span> gives people more ways to express their preferences and candidates an incentive to earn broader support.</p>
        </div>
        <div className="sticker" aria-label="A more fair, representative way to vote for America"><span>A MORE FAIR,</span><span>REPRESENTATIVE</span><span>WAY TO VOTE</span><span>FOR AMERICA</span></div>
      </div>
    </section>
  );
}
