// One-time admin command: creates missing state tabs in the configured workbook.
// Does not create a new workbook or delete/edit existing sheets.
import { google } from "googleapis";
const data = await import('../src/lib/states.ts');
const states = data.STATES;
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!spreadsheetId || !email || !key) { console.error('Set GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY in your shell or .env.local loader.'); process.exit(1); }
const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({version:'v4', auth});
const found = await sheets.spreadsheets.get({spreadsheetId, fields:'sheets(properties(title,sheetId))'});
const existing = new Set(found.data.sheets?.map(s => s.properties?.title));
const missing = Object.values(states).filter(name => !existing.has(name));
if (missing.length) await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:missing.map(title=>({addSheet:{properties:{title,gridProperties:{frozenRowCount:1}}}}))}});
const headers=['Signed Up (UTC)','Name','Email','Address','Phone','State','Consent','Source'];
for(const name of missing){await sheets.spreadsheets.values.update({spreadsheetId,range:`'${name}'!A1:H1`,valueInputOption:'RAW',requestBody:{values:[headers]}})}
console.log(`Created ${missing.length} state tabs. Preserved ${Object.keys(states).length-missing.length} existing state tabs.`);
