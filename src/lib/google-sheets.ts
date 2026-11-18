import "server-only";
import { google } from "googleapis";
import type { Signup } from "./validate-signup";
import { STATES, STATE_CODES, type StateCode } from "./states";

export const SIGNUP_HEADERS = ["Signed Up (UTC)", "Name", "Email", "Address", "Phone", "State", "Consent", "Source"];

export function hasSignupConfiguration(): boolean {
  return Boolean(process.env.GOOGLE_SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.NEXT_PUBLIC_CONTACT_EMAIL);
}

function getClient() {
  if (!hasSignupConfiguration()) throw new Error("Signup integration has not been configured.");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return google.sheets({ version: "v4", auth });
}

/** Run once using npm run setup:sheets before enabling signups. */
export async function prepareStateSheets() {
  const sheets = getClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(title,sheetId))" });
  const existing = new Set((metadata.data.sheets ?? []).map(s => s.properties?.title));
  const missing = STATE_CODES.filter(code => !existing.has(STATES[code]));
  if (missing.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: missing.map(code => ({ addSheet: { properties: { title: STATES[code], gridProperties: { frozenRowCount: 1 } } } })) } });
  }
  // Write headers only on brand-new tabs; preserve any existing records.
  for (const code of missing) {
    await sheets.spreadsheets.values.update({ spreadsheetId, range: `'${STATES[code]}'!A1:H1`, valueInputOption: "RAW", requestBody: { values: [SIGNUP_HEADERS] } });
  }
  return missing.length;
}

export async function appendSignup(row: Signup) {
  const sheets = getClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const tab: string = STATES[row.state];
  // Tabs are created ahead of time via setup:sheets to avoid races on live submissions.
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tab}'!A:H`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[new Date().toISOString(), row.name, row.email, row.address, row.phone, tab, "Email updates: yes", "Rank America website"]] }
  });
}
