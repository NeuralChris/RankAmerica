import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnsubscribeToken, readUnsubscribeToken } from '../src/lib/email/unsubscribe-token.ts';
import { welcomeEmail, donationReceiptEmail } from '../src/lib/email/templates.ts';

const secret = 'test-secret-value';
test('unsubscribe token round-trips and normalizes email', () => {
  const token = createUnsubscribeToken(' Person@Example.com ', 'CO', secret);
  assert.deepEqual(readUnsubscribeToken(token, secret), { email: 'person@example.com', state: 'CO' });
});
test('tampered or foreign tokens are rejected', () => {
  const token = createUnsubscribeToken('a@example.com', 'CO', secret);
  const [payload, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify(['victim@example.com', 'CO'])).toString('base64url');
  assert.equal(readUnsubscribeToken(`${forged}.${sig}`, secret), null);
  assert.equal(readUnsubscribeToken(token, 'other-secret'), null);
  assert.equal(readUnsubscribeToken(`${payload}.${sig}x`, secret), null);
  assert.equal(readUnsubscribeToken('garbage', secret), null);
  assert.equal(readUnsubscribeToken(token, undefined), null);
});
test('welcome email escapes names and greets by first name', () => {
  const email = welcomeEmail({ name: 'Jo <script>alert(1)</script> Smith', state: 'CO', stateName: 'Colorado', unsubscribeUrl: 'https://x/u', siteUrl: 'https://x' });
  assert.ok(!email.html.includes('<script>alert'));
  assert.match(email.subject, /^You’re on the list, Jo$/);
  assert.ok(email.html.includes('https://x/u') && email.text.includes('https://x/u'));
});
test('donation receipt formats amount and only shows manage link for monthly', () => {
  const base = { name: 'Jordan Lee', amountCents: 2500, date: new Date('2026-11-18T12:00:00Z'), paymentMethod: 'Visa ending in 4242', receiptNumber: 'RA-1', siteUrl: 'https://x', manageUrl: 'https://manage' };
  const monthly = donationReceiptEmail({ ...base, frequency: 'monthly', nextDate: new Date('2026-12-18T12:00:00Z') });
  const once = donationReceiptEmail({ ...base, frequency: 'one-time' });
  assert.ok(monthly.html.includes('$25.00') && monthly.html.includes('December 18, 2026') && monthly.html.includes('https://manage'));
  assert.ok(!once.html.includes('https://manage') && once.html.includes('ONE-TIME'));
});
