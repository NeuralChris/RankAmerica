"use client";

import Link from "next/link";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="container nav-wrap">
        <Link aria-label="Rank America home" className="brand rank-america-brand" href="/" onClick={() => setOpen(false)}>
          <img alt="Rank America" src="/assets/rank-america-logo-dark.png" />
        </Link>
        <button type="button" className="nav-toggle" aria-controls="main-links" aria-expanded={open} aria-label="Toggle menu" onClick={() => setOpen(x => !x)}>☰</button>
        <nav aria-label="Main navigation" className={`nav-links ${open ? "open" : ""}`} id="main-links">
          <Link href="/#problem" onClick={() => setOpen(false)}>The Problem</Link>
          <Link href="/#better" onClick={() => setOpen(false)}>The Better Way</Link>
          <Link href="/#try-it" onClick={() => setOpen(false)}>Try It</Link>
          <Link href="/polls/new" onClick={() => setOpen(false)}>Make a Poll</Link>
          <Link href="/#faq" onClick={() => setOpen(false)}>FAQ</Link>
          <Link href="/#get-involved" onClick={() => setOpen(false)}>Get Involved</Link>
        </nav>
        <Link className="btn nav-cta" href="/#get-involved">Join the Movement <span className="arrow" aria-hidden="true">→</span></Link>
      </div>
    </header>
  );
}
