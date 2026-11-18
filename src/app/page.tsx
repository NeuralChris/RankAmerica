import { headers } from "next/headers";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Comparison } from "@/components/Comparison";
import { BallotDemo } from "@/components/BallotDemo";
import { HowItWorks } from "@/components/HowItWorks";
import { Faq } from "@/components/Faq";
import { JoinSection } from "@/components/JoinSection";
import { SiteFooter } from "@/components/SiteFooter";
import { chooseDisplayedState } from "@/lib/geo";

// Per-visitor header-based selection must be evaluated dynamically, not cached globally.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ state?: string | string[] }> }) {
  const [requestHeaders, query] = await Promise.all([headers(), searchParams]);
  const location = chooseDisplayedState(requestHeaders, query.state);
  const signupEnabled = Boolean(process.env.GOOGLE_SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.NEXT_PUBLIC_CONTACT_EMAIL);
  const paypalUrl = process.env.NEXT_PUBLIC_PAYPAL_DONATION_URL?.startsWith("https://") ? process.env.NEXT_PUBLIC_PAYPAL_DONATION_URL : null;
  return <>
    <SiteHeader />
    <main>
      <Hero state={location.state} source={location.source} />
      <Comparison />
      <BallotDemo />
      <HowItWorks />
      <Faq />
      <JoinSection initialState={location.state} signupEnabled={signupEnabled} paypalUrl={paypalUrl} />
    </main>
    <SiteFooter />
  </>;
}
