import "server-only";
import { google, type sheets_v4 } from "googleapis";
import type { Signup } from "./validate-signup";
import { STATES, STATE_CODES, type StateCode } from "./states";

export const SIGNUP_HEADERS = ["Signed Up (UTC)", "Name", "Email", "Address", "Phone", "State", "Consent", "Source", "Unsubscribed (UTC)"];
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/** Signups are enabled once a target spreadsheet is configured. */
export function hasSignupConfiguration(): boolean {
  return Boolean(process.env.GOOGLE_SPREADSHEET_ID);
}

/**
 * Prefers keyless auth (Application Default Credentials): on Cloud Run this is the
 * service's runtime service account; locally, `gcloud auth application-default login
 * --impersonate-service-account=…`. A service-account key in GOOGLE_PRIVATE_KEY is
 * still honoured for hosts without ADC.
 */
let client: sheets_v4.Sheets | null = null;
function getClient(): sheets_v4.Sheets {
  if (!hasSignupConfiguration()) throw new Error("Signup integration has not been configured.");
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const auth = email && key
    ? new google.auth.JWT({ email, key: key.replace(/\\n/g, "\n"), scopes: SCOPES })
    : new google.auth.GoogleAuth({ scopes: SCOPES });
  client = google.sheets({ version: "v4", auth });
  return client;
}

/** Creates a state tab with a frozen header row. Safe if another request created it first. */
async function addStateTab(sheets: sheets_v4.Sheets, spreadsheetId: string, title: string) {
  try {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }] } });
  } catch (error) {
    if (!String((error as Error)?.message).includes("already exists")) throw error;
    return; // created concurrently; it already has headers
  }
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `'${title}'!A1:I1`, valueInputOption: "RAW", requestBody: { values: [SIGNUP_HEADERS] } });
}

/** Pre-creates all 50 state tabs (optional; appendSignup creates missing tabs on demand). */
export async function prepareStateSheets() {
  const sheets = getClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(title))" });
  const existing = new Set((metadata.data.sheets ?? []).map(s => s.properties?.title));
  const missing = STATE_CODES.filter(code => !existing.has(STATES[code]));
  for (const code of missing) await addStateTab(sheets, spreadsheetId, STATES[code]);
  return missing.length;
}

export async function appendSignup(row: Signup) {
  const sheets = getClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const tab: string = STATES[row.state];
  const append = () => sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tab}'!A:I`,
    // RAW stores input as plain text, so values like "=HYPERLINK(...)" are never evaluated.
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[new Date().toISOString(), row.name, row.email, row.address, row.phone, tab, "Email updates: yes", "Rank America website", ""]] }
  });
  try {
    await append();
  } catch (error) {
    // Missing state tab → create it and retry once.
    if (!String((error as Error)?.message).includes("Unable to parse range")) throw error;
    await addStateTab(sheets, spreadsheetId, tab);
    await append();
  }
}

/**
 * Records an unsubscribe by timestamping column I on every row in the state's tab with
 * this email. Returns how many rows matched (0 if the email or tab isn't there).
 */
export async function markUnsubscribed(email: string, state: StateCode): Promise<number> {
  const sheets = getClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const tab: string = STATES[state];
  let rows: string[][];
  try {
    rows = (await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!C:I` })).data.values ?? [];
  } catch (error) {
    if (String((error as Error)?.message).includes("Unable to parse range")) return 0;
    throw error;
  }
  const target = email.trim().toLowerCase();
  const now = new Date().toISOString();
  // Columns C..I → index 0 is Email, index 6 is Unsubscribed. Row 1 is the header.
  const matches = rows.flatMap((r, i) => i > 0 && r[0]?.trim().toLowerCase() === target ? [{ row: i + 1, done: Boolean(r[6]) }] : []);
  const data = matches.filter(m => !m.done).map(m => ({ range: `'${tab}'!I${m.row}`, values: [[now]] }));
  if (data.length) await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data } });
  return matches.length;
}
