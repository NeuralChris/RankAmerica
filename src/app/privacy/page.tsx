import Link from "next/link";
export const metadata = { title: "Privacy | Rank America" };
export default function PrivacyPage() {
  return <main className="privacy-page"><div className="container"><Link href="/" className="privacy-back">← Rank America</Link><h1>Privacy & email updates</h1><p><strong>Draft policy for the prelaunch website.</strong></p>
    <h2>Information collected</h2><p>When you sign up, we collect the name, email address and state that you provide, as well as optional mailing address and phone number. This information will be used to manage Rank America email updates and to organize state-specific communications.</p>
    <h2>Storage</h2><p>Signup information is stored in a private Google Sheet with a separate tab for each state. It is not published on the website. Access is restricted to people managing the project.</p>
    <h2>Location</h2><p>The site may use an approximate state derived from hosting-provider IP geolocation to select artwork and prefill the state field. This lookup is not a verified residence or address. The signup process does not store the visitor’s IP address in Google Sheets.</p>
    <h2>Consent and unsubscribing</h2><p>Email updates require your explicit consent. Every update will include instructions for unsubscribing.</p>
    <h2>Donations</h2><p>Donations are processed by Stripe on Stripe’s secure checkout page, under <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe’s privacy policy</a>. Rank America never receives or stores your full card number. Stripe shares your name, email, billing address, amount and the last four digits of your card with us so we can send receipts, keep contribution records and let you manage a monthly contribution. Donating does not sign you up for email updates.</p>
    <h2>Contact</h2><p>For privacy, deletion or unsubscribe requests, reply to any Rank America email or use the unsubscribe link it contains.</p>
    <p className="privacy-note">Review and finalize this policy before launching publicly. This is site setup text, not a completed legal compliance review.</p>
  </div></main>;
}
