import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { rm } from 'node:fs/promises';
import test from 'node:test';

import { appConfig } from 'config';

import { cacheGet, cachePut, cacheStats, ensureCache } from './cache';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../../..');
const cacheModuleUrl = pathToFileURL(resolve(import.meta.dirname, 'cache.ts')).href;

test('persists content-addressed cache entries across process restart', async () => {
  await rm(appConfig.cache.path, { recursive: true, force: true });
  try {
    await ensureCache();
    await cachePut('derivatives/restart-test.jxl', new TextEncoder().encode('cached-derivative'));
    assert.equal((await cacheGet('derivatives/restart-test.jxl'))?.toString(), 'cached-derivative');
    assert.deepEqual(await cacheStats(), { entries: 1, bytes: 17 });

    await execFileAsync(
      process.execPath,
      [
        resolve(repositoryRoot, 'node_modules/tsx/dist/cli.mjs'),
        '--eval',
        `import { cacheGet, cacheStats, ensureCache } from ${JSON.stringify(cacheModuleUrl)}; (async () => { await ensureCache(); const value = await cacheGet('derivatives/restart-test.jxl'); const stats = await cacheStats(); if (value?.toString() !== 'cached-derivative' || stats.entries !== 1 || stats.bytes !== 17) process.exitCode = 1; })();`,
      ],
      { cwd: process.cwd(), env: process.env },
    );
  } finally {
    await rm(appConfig.cache.path, { recursive: true, force: true });
  }
});

test('serializes concurrent cache writes', async () => {
  await rm(appConfig.cache.path, { recursive: true, force: true });
  try {
    await ensureCache();
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        cachePut(`derivatives/concurrent-${String(index)}.jxl`, new TextEncoder().encode(`value-${String(index)}`)),
      ),
    );
    assert.deepEqual(await cacheStats(), { entries: 12, bytes: 86 });
    assert.equal((await cacheGet('derivatives/concurrent-7.jxl'))?.toString(), 'value-7');
  } finally {
    await rm(appConfig.cache.path, { recursive: true, force: true });
  }
});
