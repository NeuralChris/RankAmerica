import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { siteUrl } from "@/lib/email/send";
import { runPollJobs } from "@/lib/polls/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The service account Cloud Scheduler signs its OIDC token as. */
const SCHEDULER_SA = process.env.POLL_CRON_SERVICE_ACCOUNT || "rank-america-web@ranked-choice-515101.iam.gserviceaccount.com";
const oauth = new OAuth2Client();

/**
 * Cloud Scheduler calls this every 15 minutes with a Google-signed OIDC token (no shared secret).
 * Closes polls past their end time and sends results emails. Open without a token in local dev only.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    try {
      if (!token) throw new Error("missing token");
      const ticket = await oauth.verifyIdToken({ idToken: token, audience: `${siteUrl()}/api/polls/cron` });
      const claims = ticket.getPayload();
      if (claims?.email !== SCHEDULER_SA || !claims.email_verified) throw new Error("unexpected caller");
    } catch {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }
  const result = await runPollJobs();
  if (result.closed || result.notified || result.failed) console.log("Poll jobs:", JSON.stringify(result));
  return NextResponse.json(result, { status: result.failed ? 500 : 200 });
}
