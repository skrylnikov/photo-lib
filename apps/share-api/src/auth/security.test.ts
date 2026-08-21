import assert from 'node:assert/strict';
import test from 'node:test';

import { hasExpectedNonce, isAllowedIdentity, isSessionActive } from './security';

test('allows configured subject and group, and rejects other identities', () => {
  assert.equal(isAllowedIdentity({ subject: 'owner', groups: [] }, ['owner'], []), true);
  assert.equal(isAllowedIdentity({ subject: 'member', groups: ['photo-admins'] }, [], ['photo-admins']), true);
  assert.equal(isAllowedIdentity({ subject: 'member', groups: ['other'] }, ['owner'], ['photo-admins']), false);
});

test('rejects callback nonce mismatch and missing nonce', () => {
  assert.equal(hasExpectedNonce('expected', 'expected'), true);
  assert.equal(hasExpectedNonce('wrong', 'expected'), false);
  assert.equal(hasExpectedNonce(undefined, 'expected'), false);
});

test('treats expired and revoked sessions as unauthenticated', () => {
  const now = new Date('2026-08-18T00:00:00.000Z');
  assert.equal(isSessionActive({ revokedAt: null, expiresAt: new Date('2026-08-18T01:00:00.000Z') }, now), true);
  assert.equal(isSessionActive({ revokedAt: null, expiresAt: new Date('2026-08-17T23:00:00.000Z') }, now), false);
  assert.equal(isSessionActive({ revokedAt: now, expiresAt: new Date('2026-08-18T01:00:00.000Z') }, now), false);
});
