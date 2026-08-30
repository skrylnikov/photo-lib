import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanupMediaDeletion } from './maintenance';

const deletion = { mediaId: 'media-1', originalKey: 'originals/media-1', attempts: 0 };

test('media deletion cleanup removes objects and cache entries, including already missing objects', async () => {
  const objects = new Set([deletion.originalKey, 'derivatives/media-1/jpeg/640', 'derivatives/media-1/webp/640']);
  const cache = new Set(['derivatives/media-1/jpeg/640', 'derivatives/media-1/webp/640']);
  let completed = false;
  const dependencies = {
    removeObject: (key: string) => { objects.delete(key); return Promise.resolve(); },
    listObjects: (prefix: string) => Promise.resolve([...objects].filter((key) => key.startsWith(prefix)).map((key) => ({ key }))),
    removeCache: (key: string) => { cache.delete(key); return Promise.resolve(); },
    complete: () => { completed = true; return Promise.resolve(); },
    retry: () => Promise.reject(new Error('successful cleanup must not retry')),
    now: () => new Date('2026-08-31T00:00:00Z'),
  };

  await cleanupMediaDeletion(deletion, dependencies);
  assert.equal(completed, true);
  assert.equal(objects.size, 0);
  assert.equal(cache.size, 0);

  completed = false;
  await cleanupMediaDeletion(deletion, dependencies);
  assert.equal(completed, true);
});

test('media deletion cleanup retries a temporary object-store failure with bounded backoff', async () => {
  let retry: { mediaId: string; attempts: number; availableAt: Date } | undefined;
  await cleanupMediaDeletion(deletion, {
    removeObject: () => Promise.reject(new Error('temporary_storage_failure')),
    listObjects: () => Promise.resolve([]),
    removeCache: () => Promise.resolve(),
    complete: () => Promise.reject(new Error('failed cleanup must keep its tombstone')),
    retry: (mediaId, attempts, availableAt) => { retry = { mediaId, attempts, availableAt }; return Promise.resolve(); },
    now: () => new Date('2026-08-31T00:00:00Z'),
  });

  assert.deepEqual(retry, {
    mediaId: 'media-1',
    attempts: 1,
    availableAt: new Date('2026-08-31T00:00:05Z'),
  });
});
