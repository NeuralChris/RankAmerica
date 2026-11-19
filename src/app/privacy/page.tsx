import Link from "next/link";
export const metadata = { title: "Privacy | Rank America" };
export default function PrivacyPage() {
  return <main className="privacy-page"><div className="container"><Link href="/" className="privacy-back">← Rank America</Link><h1>Privacy & email updates</h1><p><strong>Draft policy for the prelaunch website.</strong></p>
    <h2>Information collected</h2><p>When you sign up, we collect the name, email address and state that you provide, as well as optional mailing address and phone number. This information will be used to manage Rank America email updates and to organize state-specific communications.</p>
    <h2>Storage</h2><p>Signup information is stored in a private Google Sheet with a separate tab for each state. It is not published on the website. Access is restricted to people managing the project.</p>
    <h2>Location</h2><p>The site may use an approximate state derived from hosting-provider IP geolocation to select artwork and prefill the state field. This lookup is not a verified residence or address. The signup process does not store the visitor’s IP address in Google Sheets.</p>
    <h2>Consent and unsubscribing</h2><p>Email updates require your explicit consent. Every update will include instructions for unsubscribing.</p>
    <h2>Donations</h2><p>Donations are processed by Stripe on Stripe’s secure checkout page, under <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe’s privacy policy</a>. Rank America never receives or stores your full card number. Stripe shares your name, email, billing address, amount and the last four digits of your card with us so we can send receipts, keep contribution records and let you manage a monthly contribution. Donating does not sign you up for email updates.</p>
    <h2>Ranked-choice polls</h2>
    <p><strong>Creating a poll.</strong> We store your question, options, end time and email address. Your email is used to send the link that publishes the poll, your private manage link, and the results when voting ends. It is never shown to voters. Creating a poll does not sign you up for email updates unless you check that box.</p>
    <p><strong>Voting.</strong> Ballots are anonymous. To allow one ballot per browser, the site sets a cookie holding a random ID, and stores only a scrambled (keyed hash) form of that ID and of your IP address with your ballot. Neither can be turned back into the original. If you ask to be emailed the result, we store that address with your ballot, use it for that single email, and then delete it.</p>
    <p><strong>Retention.</strong> Polls that are never published are deleted after 48 hours. Published polls, their ballots and results are deleted automatically one year after voting ends, or right away if the creator deletes the poll. Poll data is stored in Google Cloud Firestore and is not shared with anyone else. Polls are unlisted: they’re kept out of search engines, but anyone with a poll’s link can view it and its results (if the creator made them visible).</p>
    <h2>Contact</h2><p>For privacy, deletion or unsubscribe requests, reply to any Rank America email or use the unsubscribe link it contains.</p>
    <p className="privacy-note">Review and finalize this policy before launching publicly. This is site setup text, not a completed legal compliance review.</p>
  </div></main>;
}
