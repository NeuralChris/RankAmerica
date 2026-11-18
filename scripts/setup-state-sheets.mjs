// One-time admin command: creates any missing state tabs (with headers) in the configured
// workbook. Does not create a new workbook or delete/edit existing sheets. Optional: the
// site also creates a state's tab on its first signup.
//
// Auth: a service-account key (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY), or keyless via
//   gcloud auth application-default login --impersonate-service-account=SA_EMAIL
import { google } from "googleapis";
const { STATES } = await import("../src/lib/states.ts");
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const HEADERS = ["Signed Up (UTC)", "Name", "Email", "Address", "Phone", "State", "Consent", "Source", "Unsubscribed (UTC)"];

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
if (!spreadsheetId) { console.error("Set GOOGLE_SPREADSHEET_ID (e.g. in .env.local)."); process.exit(1); }
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const auth = email && key ? new google.auth.JWT({ email, key, scopes: SCOPES }) : new google.auth.GoogleAuth({ scopes: SCOPES });
const sheets = google.sheets({ version: "v4", auth });

const found = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(title))" });
const existing = new Set(found.data.sheets?.map(s => s.properties?.title));
const missing = Object.values(STATES).filter(name => !existing.has(name));
if (missing.length) {
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: missing.map(title => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) } });
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: missing.map(name => ({ range: `'${name}'!A1:I1`, values: [HEADERS] })) } });
}
console.log(`Created ${missing.length} state tabs. Preserved ${Object.keys(STATES).length - missing.length} existing state tabs.`);
