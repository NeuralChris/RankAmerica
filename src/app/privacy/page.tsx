import Link from "next/link";
export const metadata = { title: "Privacy | Rank America" };
export default function PrivacyPage() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return <main className="privacy-page"><div className="container"><Link href="/" className="privacy-back">← Rank America</Link><h1>Privacy & email updates</h1><p><strong>Draft policy for the prelaunch website.</strong> The signup form will remain disabled until the necessary integrations and contact details are configured.</p>
    <h2>Information collected</h2><p>When signups are enabled, we plan to collect the name, email address and state that you provide, as well as optional mailing address and phone number. This information will be used to manage Rank America email updates and to organize state-specific communications.</p>
    <h2>Storage</h2><p>Signup information will be stored in a private Google Sheet with a separate tab for each state. It will not be published on the website. Access should be restricted to people managing the project.</p>
    <h2>Location</h2><p>The site may use an approximate state derived from hosting-provider IP geolocation to select artwork and prefill the state field. This lookup is not a verified residence or address. The signup process does not store the visitor's IP address in Google Sheets.</p>
    <h2>Consent and unsubscribing</h2><p>Email updates require your explicit consent. An unsubscribe process and instructions in emails must be provided before distributing any updates.</p>
    <h2>Donations</h2><p>When configured, donations will be processed on PayPal's site under PayPal's privacy policies. Rank America will not collect payment card details directly.</p>
    <h2>Contact</h2><p>{contact ? <>For privacy or unsubscribe requests, contact <a href={`mailto:${contact}`}>{contact}</a>.</> : "A project contact address must be added before accepting live signups."}</p>
    <p className="privacy-note">Review and finalize this policy before launching publicly. This is site setup text, not a completed legal compliance review.</p>
  </div></main>;
}
