import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNewPoll, rankingKey, resultsVisible, acceptingVotes } from '../src/lib/polls/model.ts';

const now = Date.parse('2026-11-19T12:00:00Z');
const good = { question: '  Team   lunch? ', options: ['Tacos', ' Pizza ', ''], closesAt: '2026-11-20T12:00:00Z', resultsVisibility: 'live', creatorEmail: ' Me@Example.com ', timeZone: 'America/Denver' };

test('a valid poll is cleaned up', () => {
  const r = validateNewPoll(good, now);
  assert.ok(r.ok);
  assert.equal(r.value.question, 'Team lunch?');
  assert.deepEqual(r.value.options, ['Tacos', 'Pizza']);
  assert.equal(r.value.creatorEmail, 'me@example.com');
  assert.equal(r.value.timeZone, 'America/Denver');
});
test('end time must be 1 hour to 90 days out; unknown time zones fall back', () => {
  assert.ok(!validateNewPoll({ ...good, closesAt: '2026-11-19T12:30:00Z' }, now).ok);
  assert.ok(!validateNewPoll({ ...good, closesAt: '2027-03-01T00:00:00Z' }, now).ok);
  assert.equal(validateNewPoll({ ...good, timeZone: 'Mars/Olympus' }, now).value.timeZone, 'America/New_York');
});
test('option count, length and uniqueness are enforced', () => {
  assert.ok(!validateNewPoll({ ...good, options: ['Only'] }, now).ok);
  assert.ok(!validateNewPoll({ ...good, options: Array.from({ length: 11 }, (_, i) => `O${i}`) }, now).ok);
  assert.ok(!validateNewPoll({ ...good, options: ['A', 'x'.repeat(81)] }, now).ok);
  assert.ok(!validateNewPoll({ ...good, options: ['Pizza', 'pizza'] }, now).ok);
});
test('rankings must be non-empty, known and without repeats', () => {
  const opts = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
  assert.equal(rankingKey(['c', 'a'], opts), 'ca');
  for (const bad of [[], ['a', 'a'], ['z'], 'a', null, ['a', 'b', 'c', 'a']]) assert.equal(rankingKey(bad, opts), null);
});
test('results visibility and vote acceptance follow status and end time', () => {
  const base = { status: 'open', resultsVisibility: 'after_close', closesAt: '2026-11-20T12:00:00Z' };
  assert.equal(resultsVisible(base), false);
  assert.equal(resultsVisible({ ...base, resultsVisibility: 'live' }), true);
  assert.equal(resultsVisible({ ...base, status: 'closed' }), true);
  assert.equal(acceptingVotes(base, now), true);
  assert.equal(acceptingVotes(base, Date.parse('2026-11-21T00:00:00Z')), false);
  assert.equal(acceptingVotes({ ...base, status: 'pending' }, now), false);
});
