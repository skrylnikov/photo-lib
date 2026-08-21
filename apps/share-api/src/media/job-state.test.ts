import assert from 'node:assert/strict';
import test from 'node:test';

import { failureTransition, leaseExpired } from './job-state';

test('retries a job before the configured terminal attempt', () => {
  const now = new Date('2026-08-18T00:00:00.000Z');
  const transition = failureTransition(1, 3, now);
  assert.equal(transition.terminal, false);
  assert.equal(transition.jobStatus, 'pending');
  assert.equal(transition.mediaStatus, 'pending');
  assert.equal(transition.availableAt.toISOString(), '2026-08-18T00:00:05.000Z');
});

test('marks the final failure terminal and recovers expired leases', () => {
  const now = new Date('2026-08-18T00:00:00.000Z');
  assert.equal(failureTransition(3, 3, now).terminal, true);
  assert.equal(leaseExpired(new Date('2026-08-17T23:59:00.000Z'), now), true);
  assert.equal(leaseExpired(new Date('2026-08-18T00:01:00.000Z'), now), false);
});
