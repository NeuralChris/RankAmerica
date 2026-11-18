"use client";

import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="container nav-wrap">
        <a aria-label="Rank America home" className="brand rank-america-brand" href="#top" onClick={() => setOpen(false)}>
          <img alt="Rank America" src="/assets/rank-america-logo-dark.png" />
        </a>
        <button type="button" className="nav-toggle" aria-controls="main-links" aria-expanded={open} aria-label="Toggle menu" onClick={() => setOpen(x => !x)}>☰</button>
        <nav aria-label="Main navigation" className={`nav-links ${open ? "open" : ""}`} id="main-links">
          <a href="#problem" onClick={() => setOpen(false)}>The Problem</a>
          <a href="#better" onClick={() => setOpen(false)}>The Better Way</a>
          <a href="#try-it" onClick={() => setOpen(false)}>Try It</a>
          <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
          <a href="#get-involved" onClick={() => setOpen(false)}>Get Involved</a>
        </nav>
        <a className="btn nav-cta" href="#get-involved">Join the Movement <span className="arrow" aria-hidden="true">→</span></a>
      </div>
    </header>
  );
}
