import test from 'node:test';
import assert from 'node:assert/strict';
import { countPoll, ballotsFromTally } from '../src/lib/polls/count.ts';

const ids = ['a', 'b', 'c'];
test('first-round majority wins immediately', () => {
  const r = countPoll(ids, [{ order: ['a'], count: 6 }, { order: ['b'], count: 4 }]);
  assert.equal(r.length, 1);
  assert.equal(r[0].winner, 'a');
});
test('transfers decide the winner and exhausted ballots drop out', () => {
  // a4 b4 c3 (11 active) → c out: 2 move to b, 1 exhausts. Round 2: a4 b6 of 10 → b wins.
  const r = countPoll(ids, [
    { order: ['a'], count: 4 },
    { order: ['b', 'c'], count: 4 },
    { order: ['c', 'b'], count: 2 },
    { order: ['c'], count: 1 },
  ]);
  assert.equal(r[0].eliminated, 'c');
  assert.equal(r[0].tieBreak, null);
  assert.deepEqual(r[0].transferredTo, [{ id: 'b', count: 2 }]);
  assert.equal(r[0].newlyExhausted, 1);
  assert.equal(r[1].active, 10);
  assert.equal(r[1].exhausted, 1);
  assert.equal(r[1].winner, 'b');
});
test('a tie for last with no earlier round is settled by a repeatable lot', () => {
  const ballots = [{ order: ['a'], count: 5 }, { order: ['b'], count: 4 }, { order: ['c', 'b'], count: 3 }, { order: ['d', 'a'], count: 3 }];
  const r = countPoll(['a', 'b', 'c', 'd'], ballots, 'x');
  assert.equal(r[0].tieBreak, 'lot');
  assert.ok(['c', 'd'].includes(r[0].eliminated));
  assert.deepEqual(countPoll(['a', 'b', 'c', 'd'], ballots, 'x'), r); // same poll, same result
});
test('earlier-round tie break picks the option that was weaker before', () => {
  // R1: a6 b5 c4 d1 → d out, its ballot moves to c. R2: a6 b5 c5 → b and c tie; in R1 c had fewer → c out.
  const r = countPoll(['a', 'b', 'c', 'd'], [
    { order: ['a'], count: 6 }, { order: ['b', 'a'], count: 5 }, { order: ['c', 'b'], count: 4 }, { order: ['d', 'c'], count: 1 },
  ]);
  assert.equal(r[0].eliminated, 'd');
  assert.equal(r[1].eliminated, 'c');
  assert.equal(r[1].tieBreak, 'earlier-round');
  assert.equal(r[2].winner, 'b');
});
test('no ballots gives no winner; invalid and duplicate choices are ignored', () => {
  assert.deepEqual(countPoll(ids, []).map(r => r.winner), [null]);
  const r = countPoll(ids, [{ order: ['z', 'a', 'a'], count: 2 }, { order: ['b'], count: 1 }]);
  assert.equal(r[0].winner, 'a');
});
test('a two-way tie with no history is settled by lot, then the survivor wins', () => {
  const r = countPoll(['a', 'b'], [{ order: ['a'], count: 2 }, { order: ['b'], count: 2 }], 'poll1');
  assert.equal(r[0].tieBreak, 'lot');
  assert.ok(r[1].winner);
});
test('tally keys expand to ballots', () => {
  assert.deepEqual(ballotsFromTally({ cab: 3, b: 1 }), [{ order: ['c', 'a', 'b'], count: 3 }, { order: ['b'], count: 1 }]);
});
