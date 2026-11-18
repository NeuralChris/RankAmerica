export function SiteFooter() {
  return <footer className="site-footer"><div className="container">
    <span>Rank America · Copyright © {new Date().getFullYear()}</span>
    <span><a href="/privacy">Privacy</a> · <a target="_blank" rel="noopener noreferrer" href="https://www.ncsl.org/elections-and-campaigns/ranked-choice-voting">Election rules: NCSL reference</a></span>
  </div></footer>;
}
