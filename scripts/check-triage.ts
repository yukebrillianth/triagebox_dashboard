/**
 * Runs the triage sort/narrow helpers, because `Victim.currentPriority` is
 * nullable in schema.prisma and every previous null bug here was silent:
 * `PRIORITY_RANK[null]` gave `undefined`, `undefined - undefined` gave NaN, and
 * the comparator returned NaN — which Array.prototype.sort treats as "equal",
 * so "Merah dulu" simply stopped working with no error anywhere.
 *
 * Run: node --experimental-strip-types --no-warnings scripts/check-triage.ts
 */
import assert from 'node:assert/strict';

import {
  PRIORITIES,
  asEsi,
  asPriority,
  priorityRank,
  rrBandLabel,
} from '../components/triage/formatters.ts';

// The four wire values, in triage order. Pinned, not re-derived: this is the
// order the "Merah dulu" sort and the Command Center column both promise.
assert.deepEqual(PRIORITIES, ['RED', 'YELLOW', 'GREEN', 'BLACK']);

assert.equal(asPriority('RED'), 'RED');
assert.equal(asPriority('EXPECTANT'), null);
assert.equal(asPriority(''), null);
assert.equal(asPriority(null), null);
assert.equal(asPriority(undefined), null);

// A victim with no verdict sorts after every verdict, and never NaN.
assert.equal(priorityRank('RED'), 0);
assert.equal(priorityRank('BLACK'), 3);
assert.equal(priorityRank(null), PRIORITIES.length);
assert.equal(priorityRank(undefined), PRIORITIES.length);

// The comparator as the list pages actually build it.
const rows = [
  { id: 'no-verdict', p: null },
  { id: 'green', p: 'GREEN' as const },
  { id: 'red', p: 'RED' as const },
  { id: 'black', p: 'BLACK' as const },
  { id: 'yellow', p: 'YELLOW' as const },
];
const sorted = rows
  .slice()
  .sort((a, b) => priorityRank(a.p) - priorityRank(b.p))
  .map((r) => r.id);
assert.deepEqual(sorted, ['red', 'yellow', 'green', 'black', 'no-verdict']);

// Counting by priority must skip a null rather than index with it.
const counts = { RED: 0, YELLOW: 0, GREEN: 0, BLACK: 0 };
for (const r of rows) if (r.p) counts[r.p] += 1;
assert.deepEqual(counts, { RED: 1, YELLOW: 1, GREEN: 1, BLACK: 1 });

// ESI: 0 is the wire's "did not score" sentinel (LORA_VITAL_ESI_NONE) and 1..5
// is the whole scale, so anything else must render as not scored — never as 0,
// never as a severity.
assert.equal(asEsi(1), 1);
assert.equal(asEsi(5), 5);
assert.equal(asEsi(0), null);
assert.equal(asEsi(null), null);
assert.equal(asEsi(undefined), null);
assert.equal(asEsi(6), null); // a producer bug, not a class that exists
assert.equal(asEsi(-1), null);

// RR mid-points, pinned to ui_rr_band_value() in the node firmware: the wire
// carries a band's mid-point, and the UI must name the band back rather than
// print the number as if someone counted it. Shipped constants, not re-derived.
assert.equal(rrBandLabel(10), '<12');
assert.equal(rrBandLabel(16), '12–20');
assert.equal(rrBandLabel(25), '21–30');
assert.equal(rrBandLabel(36), '>30');
assert.equal(rrBandLabel(null), null); // never asked → '-', never 0
assert.equal(rrBandLabel(undefined), null);

process.stdout.write(
  'triage OK — null priority ranks last; ESI 0/out-of-range not scored; RR bands pinned\n'
);
