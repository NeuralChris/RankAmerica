import test from 'node:test';
import assert from 'node:assert/strict';
import { countElection, DEFAULT_RANKING } from '../src/lib/rcv.ts';
import { STATES, asStateCode, getHero } from '../src/lib/states.ts';

test('50 states available and validated', () => {
  assert.equal(Object.keys(STATES).length, 50);
  assert.equal(asStateCode('us-co'), 'CO');
  assert.equal(asStateCode('ny'), 'NY');
  assert.equal(asStateCode('ZZ'), null);
  assert.equal(getHero('CO').src, '/images/states/CO.webp');
  assert.equal(getHero('NY').src, '/images/hero-default.webp');
});
test('default election counts 19 votes and finds majority winner', () => {
  const rounds = countElection(DEFAULT_RANKING);
  assert.deepEqual(Object.values(rounds[0].counts).sort((a,b)=>a-b), [2,4,5,8]);
  assert.equal(rounds[0].active, 19);
  assert.equal(rounds.at(-1).winner, 'j');
  assert.ok(rounds.at(-1).counts.j > rounds.at(-1).active/2);
});
test('one different ranking can change final winner', () => {
  const swapped = countElection(['c','m','r','j']);
  assert.equal(swapped.at(-1).winner, 'c');
});
test('reject malformed sample ballots', () => {
  assert.throws(() => countElection(['j','j','m','r']));
});
