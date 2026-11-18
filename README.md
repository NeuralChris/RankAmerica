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

## Google Sheet setup — not activated yet

Your existing spreadsheet is **Rank America Signups**. Its ID should be provided privately as `GOOGLE_SPREADSHEET_ID`. Do not put credentials in frontend code or commit `.env.local`.

1. Create a Google Cloud service account, enable the Google Sheets API, and share the existing spreadsheet with the service-account email as Editor.
2. Configure `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (multi-line key or escaped `\\n`) and `NEXT_PUBLIC_CONTACT_EMAIL` in `.env.local`.
3. To initialize the 50 state tabs once, run (from a shell with those environment variables exported):

```bash
node --env-file=.env.local --experimental-strip-types scripts/setup-state-sheets.mjs
```

4. Restart the Next.js server. Only then does the signup UI enable. State sheets contain: **Signed Up (UTC), Name, Email, Address, Phone, State, Consent, Source**.
5. Test with a controlled signup and inspect its entry in the appropriate state tab. Do not launch until a working unsubscribe process, privacy policy, spam mitigation/rate limiting, and access control review are in place. The provided API intentionally returns `503` when unconfigured; it does not claim a signup was saved.

This stage does not edit the user's Google Sheet or collect any personal data. A spreadsheet is not a mailing system—email sending and unsubscribes must be separately integrated before sending campaigns.

## Optional PayPal donations — not activated yet

Create a **hosted PayPal donation page/button**, then set `NEXT_PUBLIC_PAYPAL_DONATION_URL` to its real HTTPS URL. Until this value exists, the site displays a setup notice rather than a fake payment link. Donations take place on PayPal. **Do not claim tax deductibility** unless your organization's status actually permits it. Review campaign finance and financial disclosures before fundraising in support of ballot measures.

## Deploy to Google Cloud Run

`Dockerfile` builds a slim Next.js standalone image (listens on `$PORT`, default 8080). `cloudbuild.yaml` builds it, pushes it to Artifact Registry, and deploys it to Cloud Run.

One-time setup (replace `PROJECT_ID`; region defaults to `us-central1`):

```bash
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create rank-america --repository-format=docker --location=us-central1

# Let Cloud Build deploy to Cloud Run (Cloud Build runs as the Compute Engine default SA in newer projects)
PROJECT_NUMBER=$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')
BUILD_SA=$PROJECT_NUMBER-compute@developer.gserviceaccount.com
gcloud projects add-iam-policy-binding PROJECT_ID --member=serviceAccount:$BUILD_SA --role=roles/run.admin
gcloud projects add-iam-policy-binding PROJECT_ID --member=serviceAccount:$BUILD_SA --role=roles/iam.serviceAccountUser
```

Deploy:

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=_CONTACT_EMAIL=privacy@example.org
```

Or connect the GitHub repo to a Cloud Build trigger on pushes to `main` and set the `_…` substitutions in the trigger.

**Enabling signups.** Store the service-account private key in Secret Manager, grant the Cloud Run runtime service account access, then pass the spreadsheet substitutions. The key secret is only attached when `_SPREADSHEET_ID` is set.

```bash
gcloud secrets create google-private-key --data-file=key.pem   # the PEM private key from the service-account JSON
gcloud secrets add-iam-policy-binding google-private-key \
  --member=serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor
gcloud builds submit --config cloudbuild.yaml --substitutions=\
_CONTACT_EMAIL=privacy@example.org,_SPREADSHEET_ID=...,_SHEETS_SA_EMAIL=...@....iam.gserviceaccount.com
```

`NEXT_PUBLIC_*` values are compiled into the build (and `/privacy` is prerendered), so changing them requires a rebuild, not just a Cloud Run env change.

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
