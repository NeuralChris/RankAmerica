import type { ReactNode } from "react";

/** Page frame for the poll pages: a narrow centered column (header and footer come from the (site) layout). */
export function PollShell({ eyebrow, title, intro, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return <>
    <main className="poll-page">
      <div className="poll-wrap">
        {eyebrow && <div className="poll-eyebrow">{eyebrow}</div>}
        <h1 className="poll-title">{title}</h1>
        {intro && <div className="poll-intro">{intro}</div>}
        {children}
      </div>
    </main>
  </>;
}
