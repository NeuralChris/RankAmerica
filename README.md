# Rank America — Next.js foundation

This is the **Next.js App Router + React + TypeScript** migration of the existing Rank America ranked-choice voting prototype. It preserves the Concept 5 badge, hero layout, imagery, brushed-red swashes, comparison cards, FAQ, and interactive ballot.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. On `localhost` there are no IP geolocation headers, so the national hero appears. Open `http://localhost:3000/?state=CO` to preview the Colorado hero.

## Built now

- Reusable, responsive React components under `src/components/`.
- Original illustration assets under `public/assets/`.
- Interactive sample-ballot simulation, round tabs, vote transfers, next-round controls, reset, and accessible arrow reordering.
- All **50 states** in `src/lib/states.ts`, ready for state image assets.
- Server-rendered state detection using `x-vercel-ip-country` and `x-vercel-ip-country-region` (Vercel host). No browser location permission needed. Unavailable/foreign/invalid state = national hero. `?state=XX` is a **preview override**, not a verified residence.
- Signup UI, consent, optional address and phone fields, server-side `/api/subscribe`, and a one-time state-tab initialization script.
- One-time and monthly contributions through Stripe Checkout, with emailed receipts and a self-service link to change or cancel a monthly contribution (card details never touch this site).
- Draft privacy page and health endpoint.

## Add state-specific hero images

1. Generate and approve `CA.webp`, `TX.webp`, etc. (state codes, 50 states).
2. Put them in `public/images/states/`.
3. Add the new code to `AVAILABLE_HERO_ASSETS` in `src/lib/states.ts`.
4. The server will automatically serve the image when the detected state matches. Otherwise, it uses `public/images/hero-default.webp`.

Only `CO.webp` is populated in this first structural build. The default image is an existing general mountain illustration, **not** a finished national hero. The remaining 49 state images have **not** been generated.

### Geolocation caveat

The `x-vercel-ip-country-region` header is set by Vercel in deployed environments; local development typically has no state. Do not trust it as proof of residence and do not use it to assign people to supporter states without their selection. Visitors using VPNs, enterprise networks, or mobile carriers may be assigned the wrong state. The signup form lets people choose their actual state.

## Google Sheet signups

Signups are written to the **Rank America Signups** spreadsheet, one tab per state (e.g. `Colorado`, `New York`), so state-specific newsletters can pull from a single tab. Each row has **Signed Up (UTC), Name, Email, Address, Phone, State, Consent, Source**. A state's tab is created automatically on its first signup; `npm run setup:sheets` pre-creates all 50 if you want them visible up front. Existing tabs and rows are never modified.

Auth is keyless by default: the app uses Google Application Default Credentials, which on Cloud Run is the service's runtime service account. No private key is stored anywhere.

1. Create a dedicated service account and enable the Sheets API (one time):

   ```bash
   gcloud services enable sheets.googleapis.com --project ranked-choice-515101
   gcloud iam service-accounts create rank-america-web --display-name="Rank America website" --project ranked-choice-515101
   ```

2. Share the spreadsheet with `rank-america-web@ranked-choice-515101.iam.gserviceaccount.com` as **Editor** (Share button in Google Sheets; uncheck "Notify").
3. Set `GOOGLE_SPREADSHEET_ID` (in `.env.local` locally, or as a Cloud Run environment variable). The signup form enables once it is set.
4. Local development: let your own account act as the service account, then run the dev server or setup script:

   ```bash
   gcloud iam service-accounts add-iam-policy-binding rank-america-web@ranked-choice-515101.iam.gserviceaccount.com \
     --member=user:YOU@example.com --role=roles/iam.serviceAccountTokenCreator
   gcloud auth application-default login --impersonate-service-account=rank-america-web@ranked-choice-515101.iam.gserviceaccount.com
   node --env-file=.env.local --experimental-strip-types scripts/setup-state-sheets.mjs   # optional
   ```

5. Test with a controlled signup and check the right state tab. Do not launch until a working unsubscribe process, privacy policy, spam mitigation/rate limiting, and access review are in place. The API returns `503` if it can't save a signup; it never claims success it didn't get.

Hosts without Application Default Credentials can instead set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` (a service-account key; escaped `\\n` is fine). A spreadsheet is not a mailing system—email sending and unsubscribes must be integrated separately before sending campaigns.

## Email (welcome emails and unsubscribe)

New signups get a welcome email sent through [Resend](https://resend.com) from `hello@rankamerica.org`. Templates live in `src/lib/email/templates.ts` (welcome + donation receipt); `npm run preview:emails` renders them to `.email-previews/` for review.

- **Unsubscribe:** every email links to `/unsubscribe?token=…` (a confirm page) and carries one-click `List-Unsubscribe` headers. Unsubscribing timestamps the person's row in the **Unsubscribed (UTC)** column of their state tab. Anyone sending a newsletter from the sheet must skip rows with that column filled.
- **Config:** `RESEND_API_KEY` (a Resend *sending-only* key restricted to `rankamerica.org`) and `UNSUBSCRIBE_SECRET`, stored in Secret Manager as `resend-api-key` and `unsubscribe-secret` and attached to Cloud Run. `rankamerica.org` is verified in Resend via DKIM (`resend._domainkey`), SPF/bounce records on `send.` and `rsend.`, and a monitoring-only DMARC record (`_dmarc`, `p=none`), all in the `rankamerica` Cloud DNS zone. Without them signups still save; the email is just skipped. In local dev without `RESEND_API_KEY`, donation receipts are written to `.email-previews/` instead of being sent.
- **Replies:** `hello@rankamerica.org` forwards to the organizer through ImprovMX (root MX `mx1`/`mx2.improvmx.com` and SPF `v=spf1 include:spf.improvmx.com ~all` in the `rankamerica` Cloud DNS zone). The personal address lives only in ImprovMX, never on the site or in this repo. Resend's records are on subdomains and don't conflict.

## Donations (Stripe)

The "Support the project" card offers one-time or monthly contributions ($5–$10,000). It sends the visitor to **Stripe Checkout**, Stripe's hosted payment page, so no card data reaches this site. The card shows a setup notice until both Stripe values below are set.

- **`/api/donate`** creates a Checkout session (`mode: payment` for one-time, `mode: subscription` with an inline monthly price for monthly). Billing address is required. Checkout returns donors to `/?donation=thanks`.
- **`/api/stripe/webhook`** verifies the Stripe signature and sends the receipt email (`donationReceiptEmail`) through Resend. One-time receipts come from `checkout.session.completed` / `checkout.session.async_payment_succeeded`. Monthly receipts, including the first, come from `invoice.paid`. Each send uses the session or invoice ID as a Resend idempotency key, so Stripe's retries can't double-send. Disputes, refunds, early fraud warnings and failed delayed payments are only logged (IDs only), so handle them in the Stripe Dashboard.
- **`/api/donate/manage?token=…`** is the "Manage contribution" link in monthly receipts. The token is the Stripe customer ID signed with `UNSUBSCRIBE_SECRET` (domain-separated from unsubscribe tokens). Each click opens a fresh Stripe Customer Portal session. If the link is bad, or the portal call fails, donors are sent to `STRIPE_PORTAL_LOGIN_URL`, Stripe's email-code login page. That URL is public and set as a plain Cloud Run env var. It also appears under the donate card as "Manage your contribution".
- Stripe is the record of contributions. Donors are **not** added to the signup sheet or email list.

### One-time Stripe setup

Use the Rank America Stripe account. Build and test in a [sandbox](https://docs.stripe.com/sandboxes) first, then repeat in live mode.

1. **Business details:** set the public business name to *Rank America*, the statement descriptor to `RANKAMERICA.ORG` (the receipt shows it), and support email `hello@rankamerica.org`.
2. **Emails:** under Settings → Customer emails, turn **off** Stripe's own "Successful payments" receipts (the site sends its own). Under Billing → Revenue recovery, turn **on** emails for failed card payments and expiring cards, plus Smart Retries.
3. **Customer portal** (Settings → Billing → Customer portal): activate it. Allow updating payment methods and cancelling subscriptions. Set the business name, privacy policy link (`https://rankamerica.org/privacy`) and default return URL (`https://rankamerica.org/#get-involved`).
4. **Restricted API key** (Developers → API keys → Create restricted key). Grant **Write** on Checkout Sessions and Customer portal, and **Read** on Customers, PaymentIntents, Charges, Invoices, Subscriptions and PaymentMethods. Leave everything else at None. Stripe returns a clear permission error if one is missing.
5. **Webhook endpoint** (Developers → Webhooks → Add destination): URL `https://rankamerica.org/api/stripe/webhook`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `invoice.paid`, `charge.dispute.created`, `charge.refunded`, `radar.early_fraud_warning.created`. Copy its signing secret (`whsec_…`).
6. **Store the secrets and attach them to Cloud Run:**

   ```bash
   printf %s 'rk_live_…' | gcloud secrets create stripe-secret-key --data-file=- --project ranked-choice-515101
   printf %s 'whsec_…'   | gcloud secrets create stripe-webhook-secret --data-file=- --project ranked-choice-515101
   for s in stripe-secret-key stripe-webhook-secret; do
     gcloud secrets add-iam-policy-binding $s --project ranked-choice-515101 \
       --member=serviceAccount:rank-america-web@ranked-choice-515101.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
   done
   gcloud run services update rankamerica-git --project ranked-choice-515101 --region us-central1 \
     --update-secrets=STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest
   ```

### Local testing

Put the sandbox's restricted key in `.env.local` as `STRIPE_SECRET_KEY`, and set `SITE_URL=http://localhost:3000` so Checkout returns to your dev server. Then forward events with the Stripe CLI, authenticated as the Rank America sandbox (`export STRIPE_API_KEY=sk_test_…` so it never uses another account's login) and paste the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,invoice.paid,charge.dispute.created,charge.refunded,radar.early_fraud_warning.created
```

Pay with test card `4242 4242 4242 4242` (any future date, any CVC). Without `RESEND_API_KEY` locally, receipts land in `.email-previews/receipt-*.html`. Check one-time and monthly receipts, the "Manage contribution" link, and a renewal (`stripe trigger invoice.paid` is not enough here; advance a [test clock](https://docs.stripe.com/billing/testing/test-clocks) instead).

**Before going live:** **Do not claim tax deductibility.** Review campaign-finance and disclosure rules for anything that supports a ballot measure. Some require collecting employer and occupation above a threshold (Checkout `custom_fields` can add those). Stripe Tax is not enabled because contributions aren't taxable sales. Revisit that if you ever sell merchandise.

## Ranked-choice polls

Anyone can create a poll at `/polls/new`: a question, 2–10 options, an end time (1 hour to 90 days), whether results are **live** or **hidden until voting ends**, and their email, plus an optional newsletter opt-in. Voters rank as many options as they like at `/p/<id>`. When voting ends, the creator (and any voter who asked) gets the winner by email, with a link to `/p/<id>/results`. That page replays the count with the same animation as the homepage demo.

**Flow.**
1. `POST /api/polls` stores a *pending* poll and emails the creator a private manage link (`/p/<id>/manage?key=…`). Only the key's SHA-256 is stored.
2. The creator clicks **Publish** on that page. Nothing goes live until the creator's email is proven, so the API never returns a poll link.
3. Votes go to `POST /api/polls/<id>/vote`.
4. The creator can close early or delete from the manage page.

**Counting** (`src/lib/polls/count.ts`) is instant runoff with partial rankings:
- Ballots whose choices are all eliminated are exhausted.
- A winner needs over half the ballots still active.
- A tie for last is broken by the earlier round's counts, then by a lot seeded with the poll ID, so recounts are always identical.

**One ballot per browser.**
- The `ra_voter` cookie holds a random ID. The ballot's document ID is a keyed hash of poll + voter ID, so a second ballot from the same browser is rejected inside the same Firestore transaction that records the vote.
- Each IP is also capped at 25 ballots per poll, and each IP can create 10 polls per day.
- IPs and voter IDs are stored only as keyed hashes (HMAC with `UNSUBSCRIBE_SECRET` and a purpose prefix). The IP is the **last** `X-Forwarded-For` entry, the one Google's front end appends; earlier entries are client-supplied and could be forged.
- A determined person can vote again from a private window. That's acceptable for casual polls.

**Storage: Firestore** (the `(default)` database, `us-central1`, project `ranked-choice-515101`). The runtime account `rank-america-web` has `roles/datastore.user`.

| Path | Holds |
|---|---|
| `polls/{id}` | question, options (IDs `a`–`j`), end time, visibility, creator email, key hash; once closed, the final `tally` (`{"cab": 3}` = 3 ballots ranking c, a, b) and `result` |
| `polls/{id}/shards/{0–49}` | the live tally while voting is open, split across 50 documents (deleted at close) |
| `polls/{id}/ballots/{ballotId}` | ranking key; the voter's email only if they asked for the result (erased after the results email) |
| `polls/{id}/limits/{ipHash}` | ballots per IP for this poll |
| `ratelimits/{key}` | fixed-window counters (poll creation, reports) |

**Scaling.** Firestore sustains about one write per second per document, so each vote adds to one of 50 randomly chosen tally shards instead of the poll document. The vote transaction only *reads* the poll document, so votes don't queue on it. Closing *writes* it, so in-flight votes finish first and every accepted ballot is in the final count. Live results sum the shards at most every 10 seconds per instance. In local load tests, 600 concurrent votes went from 16 votes/s (median 2.9 s, one aborted ballot) on a single tally document to 124 votes/s (median 0.45 s, none lost). 2,000 votes at 150 concurrent all counted, limited by the laptop dev server rather than Firestore.

Every document has an `expireAt` field, and a **Firestore TTL policy** deletes documents after it:
- **Pending polls:** 48 hours.
- **Everything else:** a year after voting ends.

A composite index on `polls (status, closesAt)` serves the closing job. Both were created with `gcloud firestore indexes composite create` / `gcloud firestore fields ttls update`.

**Closing job.** Cloud Scheduler job `close-polls` calls `POST /api/polls/cron` every 15 minutes with a Google-signed OIDC token for `rank-america-web`. The route verifies the token's audience and email, so no shared secret is involved. Each run:
1. Closes polls past their end time and stores the result.
2. Sends any results emails still owed, then erases the voter emails.

Each email uses a Resend idempotency key, so retries never double-send.

**Moderation.** Each poll page has **Report this poll**, which emails `hello@rankamerica.org` with a link to the poll's Firestore document. To take a poll down, set its `status` to `removed`, or delete the document.

**Short share links.** `rankedchoice.vote` (registered at Spaceship, DNS in the `rankedchoicevote` Cloud DNS zone) is verified in Search Console and mapped to the Cloud Run service, along with `www.rankedchoice.vote`. Its zone holds the Cloud Run A/AAAA records, a `www` CNAME to `ghs.googlehosted.com`, and the `google-site-verification` TXT record, which must stay. `SHARE_BASE_URL=https://rankedchoice.vote` on Cloud Run makes share links use it. `src/proxy.ts` redirects `rankedchoice.vote/<id>` to `/p/<id>`, and the bare domain to the homepage. Until then, share links use `rankamerica.org/p/<id>`.

**Local development.**
- **In-memory store:** `POLLS_STORE=memory npm run dev`. No cloud access is needed, and data is lost on restart.
- **Against Firestore:** use the separate `polls-dev` database, never production:

  ```bash
  FIRESTORE_DATABASE=polls-dev FIRESTORE_DEV_ACCESS_TOKEN=$(gcloud auth print-access-token --account=YOU@example.com) npm run dev
  ```

  The token lasts an hour and is ignored outside `next dev`.

Without `RESEND_API_KEY`, poll emails are saved to `.email-previews/`. Trigger the closing job locally with `curl -X POST localhost:3000/api/polls/cron`, which skips the token check in development.

## Deploy to Google Cloud Run

Production runs in the **Ranked Choice** Google Cloud project (`ranked-choice-515101`) as the Cloud Run service `rankamerica-git` (us-central1). A Cloud Build trigger created by Cloud Run's "continuous deployment" setup builds `Dockerfile` on every push to `main` of `NeuralChris/RankAmerica` and rolls the new image out. The `Dockerfile` produces a slim Next.js standalone image listening on `$PORT` (8080).

Deploys only swap the image, so configuration lives on the service and survives every push. All settings are read at runtime; nothing needs a rebuild:

```bash
gcloud run services update rankamerica-git --project ranked-choice-515101 --region us-central1 \
  --service-account=rank-america-web@ranked-choice-515101.iam.gserviceaccount.com \
  --update-env-vars=GOOGLE_SPREADSHEET_ID=...
```

The runtime service account `rank-america-web` has no project roles; its only access is Editor on the signup spreadsheet. The trigger's build account (`1021652958246-compute@developer.gserviceaccount.com`) has `roles/iam.serviceAccountUser` on it so deploys can keep using it.

**State detection on Cloud Run.** Cloud Run does not add IP-geolocation headers by itself, so the site will show the national hero unless it sits behind a Google Cloud external HTTPS load balancer with these custom request headers on the backend service:

```bash
gcloud compute backend-services update BACKEND_SERVICE --global \
  --custom-request-header='X-Client-Region:{client_region}' \
  --custom-request-header='X-Client-Subdivision:{client_region_subdivision}'
```

`src/lib/geo.ts` reads these (and still reads Vercel's headers if deployed there).

**Local dev tip:** if `npm run dev` keeps reloading the page, delete `.next` and restart. It happens after running `npm run build` in the same folder, because the production build output confuses the dev server's live reload.

## Validate

`npm run test` — checks the ranked-choice counting logic and state helpers with Node's TypeScript stripping. `npm run build` — Next.js production build (requires installing dependencies). The frontend and Google integrations still need a deployed end-to-end test after credentials are supplied.

## Project structure

```
src/app/(site)/layout.tsx        header + footer for the homepage and poll pages
src/app/(site)/page.tsx          dynamic server-rendered homepage
src/app/layout.tsx               global layout and metadata
src/app/globals.css              original site styling + form styles
src/app/api/subscribe/route.ts   validated signup API (disabled until configured)
src/app/api/health/route.ts      deployment health endpoint
src/app/api/donate/route.ts      creates Stripe Checkout sessions
src/app/api/donate/manage/       signed link → Stripe Customer Portal
src/app/api/stripe/webhook/      verified Stripe events → receipt emails
src/app/api/polls/               create, vote, manage, report, scheduled closing
src/app/(site)/polls/new, (site)/p/  poll creation, voting, results, manage pages
src/proxy.ts                     rankedchoice.vote short-link redirects
src/app/privacy/page.tsx         prelaunch privacy draft
src/components/*                 React sections, ballot demo, forms
src/lib/states.ts                50-state map, hero assets, fallback
src/lib/geo.ts                   hosting header parsing + preview override
src/lib/rcv.ts                   pure ranked-choice simulation
src/lib/google-sheets.ts         server-only Google Sheets append/init
src/lib/stripe.ts                server-only Stripe client + config check
src/lib/donations.ts             shared amount/frequency validation
src/lib/polls/                   poll model, IRV count, Firestore + in-memory stores, service
scripts/setup-state-sheets.mjs   one-time 50-tab creation
public/assets/*                 preserved logo, hero, icons, brush strokes
public/images/states/CO.webp    Colorado hero slot
public/images/hero-default.webp national fallback placeholder
```

### Security / operational notes

- Keep the Sheet and Google credentials private; the endpoint only runs server-side.
- Donors should not be implicitly subscribed to email lists.
- A phone/address field is intentionally optional to minimize personal data collection.
