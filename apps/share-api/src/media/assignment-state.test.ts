import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAssignment } from './assignment-state';

test('assigns a ready media to an available draft album', () => {
  assert.deepEqual(resolveAssignment('album-1', { exists: true, published: false, alreadyLinked: false }), {
    status: 'pending',
    error: null,
  });
});

test('keeps a ready media private when target album is deleted or published', () => {
  assert.deepEqual(resolveAssignment('album-1', null), { status: 'unavailable', error: 'target_album_deleted' });
  assert.deepEqual(resolveAssignment('album-1', { exists: true, published: true, alreadyLinked: false }), {
    status: 'unavailable',
    error: 'target_album_published',
  });
});

test('recognizes a legacy intent without an album and an already-linked retry', () => {
  assert.deepEqual(resolveAssignment(null, null), { status: 'not_requested', error: null });
  assert.deepEqual(resolveAssignment('album-1', { exists: true, published: true, alreadyLinked: true }), {
    status: 'added',
    error: null,
  });
});

test('keeps a partial batch successful when one independent item fails', async () => {
  const results = await Promise.allSettled([
    Promise.resolve(resolveAssignment('album-1', { exists: true, published: false, alreadyLinked: false })),
    Promise.reject(new Error('image_decode_failed')),
    Promise.resolve(resolveAssignment('album-1', { exists: true, published: false, alreadyLinked: false })),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 2);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
});
