import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Header and footer for the homepage and poll pages (the "(site)" route group doesn't affect URLs).
 * Keeping the sticky header in this shared layout, outside each page, matters for scrolling: after
 * a navigation Next.js checks whether the new page's first element is in view, and a sticky header
 * always is, so pages would keep the previous page's scroll position (often the bottom).
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>
    <SiteHeader />
    {children}
    <SiteFooter />
  </>;
}
