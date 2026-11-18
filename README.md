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
- Optional hosted PayPal donation link (no payment information handled by this site).
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
- **Config:** `RESEND_API_KEY` and `UNSUBSCRIBE_SECRET` (both in Secret Manager as `resend-api-key` and `unsubscribe-secret`). Without them signups still save; the email is just skipped.
- **Replies:** `hello@rankamerica.org` forwards to the organizer via ImprovMX (MX records in the `rankamerica` Cloud DNS zone), so the personal address is never shown to recipients.

## Optional PayPal donations — not activated yet

Create a **hosted PayPal donation page/button**, then set `PAYPAL_DONATION_URL` to its real HTTPS URL. Until this value exists, the site displays a setup notice rather than a fake payment link. Donations take place on PayPal. **Do not claim tax deductibility** unless your organization's status actually permits it. Review campaign finance and financial disclosures before fundraising in support of ballot measures.

## Deploy to Google Cloud Run

Production runs in the **Ranked Choice** Google Cloud project (`ranked-choice-515101`) as the Cloud Run service `rankamerica-git` (us-central1). A Cloud Build trigger created by Cloud Run's "continuous deployment" setup builds `Dockerfile` on every push to `main` of `NeuralChris/RankAmerica` and rolls the new image out. The `Dockerfile` produces a slim Next.js standalone image listening on `$PORT` (8080).

Deploys only swap the image, so configuration lives on the service and survives every push. All settings are read at runtime; nothing needs a rebuild:

```bash
gcloud run services update rankamerica-git --project ranked-choice-515101 --region us-central1 \
  --service-account=rank-america-web@ranked-choice-515101.iam.gserviceaccount.com \
  --update-env-vars=GOOGLE_SPREADSHEET_ID=...   # PAYPAL_DONATION_URL=... when ready
```

The runtime service account `rank-america-web` has no project roles; its only access is Editor on the signup spreadsheet. The trigger's build account (`1021652958246-compute@developer.gserviceaccount.com`) has `roles/iam.serviceAccountUser` on it so deploys can keep using it.

**State detection on Cloud Run.** Cloud Run does not add IP-geolocation headers by itself, so the site will show the national hero unless it sits behind a Google Cloud external HTTPS load balancer with these custom request headers on the backend service:

```bash
gcloud compute backend-services update BACKEND_SERVICE --global \
  --custom-request-header='X-Client-Region:{client_region}' \
  --custom-request-header='X-Client-Subdivision:{client_region_subdivision}'
```

`src/lib/geo.ts` reads these (and still reads Vercel's headers if deployed there).

## Validate

`npm run test` — checks the ranked-choice counting logic and state helpers with Node's TypeScript stripping. `npm run build` — Next.js production build (requires installing dependencies). The frontend and Google integrations still need a deployed end-to-end test after credentials are supplied.

## Project structure

```
src/app/page.tsx                 dynamic server-rendered homepage
src/app/layout.tsx               global layout and metadata
src/app/globals.css              original site styling + form styles
src/app/api/subscribe/route.ts   validated signup API (disabled until configured)
src/app/api/health/route.ts      deployment health endpoint
src/app/privacy/page.tsx         prelaunch privacy draft
src/components/*                 React sections, ballot demo, forms
src/lib/states.ts                50-state map, hero assets, fallback
src/lib/geo.ts                   hosting header parsing + preview override
src/lib/rcv.ts                   pure ranked-choice simulation
src/lib/google-sheets.ts         server-only Google Sheets append/init
scripts/setup-state-sheets.mjs   one-time 50-tab creation
public/assets/*                 preserved logo, hero, icons, brush strokes
public/images/states/CO.webp    Colorado hero slot
public/images/hero-default.webp national fallback placeholder
```

### Security / operational notes

- Keep the Sheet and Google credentials private; the endpoint only runs server-side.
- This is a structured **development foundation**, not yet a production-ready supporter database or donation service.
- Donors should not be implicitly subscribed to email lists.
- A phone/address field is intentionally optional to minimize personal data collection.
