import { NextResponse, type NextRequest } from "next/server";

/**
 * Short share domain: rankedchoice.vote/<pollId> → rankamerica.org/p/<pollId>, and anything else
 * on that domain → the rankamerica.org homepage. Voting always happens on rankamerica.org, so the
 * one-ballot-per-browser cookie lives on a single domain. Requests to rankamerica.org pass through.
 */
const SHORT_HOSTS = new Set(["rankedchoice.vote", "www.rankedchoice.vote"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!SHORT_HOSTS.has(host)) return NextResponse.next();
  const site = (process.env.SITE_URL ?? "https://rankamerica.org").replace(/\/$/, "");
  const id = request.nextUrl.pathname.replace(/^\/+|\/+$/g, "");
  // 302 rather than 301 so browsers don't cache the mapping if the short-link rules ever change.
  return NextResponse.redirect(/^[0-9A-Za-z]{10}$/.test(id) ? `${site}/p/${id}` : `${site}/`, 302);
}

// Skip all Next.js internals (static files, images, and the dev server's hot-reload socket).
export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
