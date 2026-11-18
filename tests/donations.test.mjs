import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmountCents, asFrequency } from '../src/lib/donations.ts';
import { createManageToken, readManageToken } from '../src/lib/email/manage-token.ts';
import { createUnsubscribeToken } from '../src/lib/email/unsubscribe-token.ts';

test('donation amounts parse to cents within $5–$10,000', () => {
  assert.equal(parseAmountCents('25'), 2500);
  assert.equal(parseAmountCents(25), 2500);
  assert.equal(parseAmountCents('$1,000'), 100000);
  assert.equal(parseAmountCents('12.5'), 1250);
  assert.equal(parseAmountCents(' 7.99 '), 799);
  for (const bad of ['4.99', '10000.01', '0', '-25', '25.555', 'abc', '', '1e3', null, undefined, {}, '25..0']) assert.equal(parseAmountCents(bad), null, String(bad));
});
test('frequency only accepts known values', () => {
  assert.equal(asFrequency('monthly'), 'monthly');
  assert.equal(asFrequency('one-time'), 'one-time');
  assert.equal(asFrequency('weekly'), null);
});
test('manage tokens round-trip and reject tampering or other token types', () => {
  const secret = 'test-secret-value';
  const token = createManageToken('cus_ABC123', secret);
  assert.equal(readManageToken(token, secret), 'cus_ABC123');
  const forged = Buffer.from('cus_VICTIM').toString('base64url');
  assert.equal(readManageToken(`${forged}.${token.split('.')[1]}`, secret), null);
  assert.equal(readManageToken(token, 'other-secret'), null);
  assert.equal(readManageToken(token, undefined), null);
  // An unsubscribe token signed with the same secret must not open the billing portal.
  assert.equal(readManageToken(createUnsubscribeToken('a@example.com', 'CO', secret), secret), null);
});
