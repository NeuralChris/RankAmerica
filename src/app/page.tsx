import { headers } from "next/headers";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Comparison } from "@/components/Comparison";
import { BallotDemo } from "@/components/BallotDemo";
import { PollsCta } from "@/components/PollsCta";
import { HowItWorks } from "@/components/HowItWorks";
import { Faq } from "@/components/Faq";
import { JoinSection } from "@/components/JoinSection";
import { SiteFooter } from "@/components/SiteFooter";
import { chooseDisplayedState } from "@/lib/geo";
import { hasSignupConfiguration } from "@/lib/google-sheets";
import { hasDonationConfiguration, portalLoginUrl } from "@/lib/stripe";

// Per-visitor header-based selection must be evaluated dynamically, not cached globally.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ state?: string | string[]; donation?: string | string[] }> }) {
  const [requestHeaders, query] = await Promise.all([headers(), searchParams]);
  const location = chooseDisplayedState(requestHeaders, query.state);
  const signupEnabled = hasSignupConfiguration();
  // Set by Stripe Checkout's success URL and the receipt "manage" link; display-only, nothing trusts it.
  const donationNotice = query.donation === "thanks" || query.donation === "manage-unavailable" ? query.donation : null;
  return <>
    <SiteHeader />
    <main>
      <Hero state={location.state} source={location.source} />
      <Comparison />
      <BallotDemo />
      <PollsCta />
      <HowItWorks />
      <Faq />
      <JoinSection initialState={location.state} signupEnabled={signupEnabled} donationsEnabled={hasDonationConfiguration()} donationNotice={donationNotice} manageUrl={portalLoginUrl()} />
    </main>
    <SiteFooter />
  </>;
}
