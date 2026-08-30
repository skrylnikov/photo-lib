import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const cachePath = await mkdtemp(join(tmpdir(), 'photo-library-cache-'));
process.env.DERIVATIVE_CACHE_PATH = cachePath;
process.env.DERIVATIVE_CACHE_MAX_BYTES = '64';
process.env.DERIVATIVE_CACHE_HIGH_WATER_BYTES = '48';
process.env.DERIVATIVE_CACHE_TARGET_BYTES = '24';

const { cacheGet, cachePut, cacheRemove, cacheStats, ensureCache } = await import('./cache');

test('supports parallel reads, missing-file recovery, concurrent writes, and eviction', async () => {
  try {
    await ensureCache();
    const removableKey = 'remove-me';
    const removableFile = join(cachePath, `${createHash('sha256').update(removableKey).digest('hex')}.derivative`);
    await cachePut(removableKey, Buffer.from('remove'));
    await cacheRemove(removableKey);
    await cacheRemove(removableKey);
    assert.equal(await cacheGet(removableKey), null);
    await assert.rejects(() => stat(removableFile), { code: 'ENOENT' });

    await Promise.all([
      cachePut('parallel-a', Buffer.from('aaaaaaaa')),
      cachePut('parallel-b', Buffer.from('bbbbbbbb')),
    ]);
    assert.deepEqual(
      await Promise.all([cacheGet('parallel-a'), cacheGet('parallel-b')]),
      [Buffer.from('aaaaaaaa'), Buffer.from('bbbbbbbb')],
    );

    await rm(
      join(cachePath, `${createHash('sha256').update('parallel-a').digest('hex')}.derivative`),
    );
    assert.equal(await cacheGet('parallel-a'), null);
    assert.deepEqual(await cacheStats(), { entries: 1, bytes: 8 });

    await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        cachePut(`concurrent-${String(index)}`, Buffer.alloc(8, index)),
      ),
    );
    const stats = await cacheStats();
    assert.ok(stats.bytes <= 24, `expected eviction to target size, got ${String(stats.bytes)}`);
  } finally {
    await rm(cachePath, { recursive: true, force: true });
  }
});
