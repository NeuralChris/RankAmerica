import Link from "next/link";
import { readUnsubscribeToken } from "@/lib/email/unsubscribe-token";

export const metadata = { title: "Unsubscribe | Rank America", robots: { index: false } };
export const dynamic = "force-dynamic";

type Params = { token?: string; result?: string };

/** Landing page for the email footer's Unsubscribe link. Confirms before changing anything. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Params> }) {
  const { token, result } = await searchParams;
  const who = token ? readUnsubscribeToken(token) : null;

  let content;
  if (result === "done") {
    content = <>
      <h1>You’re unsubscribed.</h1>
      <p>You won’t receive any more Rank America email updates. Changed your mind? You can <Link href="/#get-involved">sign up again</Link> anytime.</p>
    </>;
  } else if (result === "error") {
    content = <>
      <h1>Something went wrong.</h1>
      <p>We couldn’t process your request just now. Please try the link again in a few minutes, or reply to any Rank America email and we’ll remove you.</p>
    </>;
  } else if (!who) {
    content = <>
      <h1>This link isn’t valid.</h1>
      <p>It may have been cut off. Try the Unsubscribe link in your most recent Rank America email, or reply to that email and we’ll remove you.</p>
    </>;
  } else {
    content = <>
      <h1>Unsubscribe from Rank America?</h1>
      <p>We’ll stop sending email updates to <strong>{who.email}</strong>.</p>
      <form method="post" action={`/api/unsubscribe?token=${encodeURIComponent(token!)}`} className="unsubscribe-actions">
        <button type="submit" className="btn">Unsubscribe</button>
        <Link href="/">Keep me subscribed</Link>
      </form>
    </>;
  }

  return <main className="privacy-page unsubscribe-page"><div className="container">
    <Link href="/" className="privacy-back">← Rank America</Link>
    {content}
  </div></main>;
}
