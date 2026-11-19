import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/** Page frame for the poll pages: site header, a narrow centered column, and the footer. */
export function PollShell({ eyebrow, title, intro, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return <>
    <SiteHeader />
    <main className="poll-page">
      <div className="poll-wrap">
        {eyebrow && <div className="poll-eyebrow">{eyebrow}</div>}
        <h1 className="poll-title">{title}</h1>
        {intro && <div className="poll-intro">{intro}</div>}
        {children}
      </div>
    </main>
    <SiteFooter />
  </>;
}
