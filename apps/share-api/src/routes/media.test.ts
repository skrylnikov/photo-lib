import assert from 'node:assert/strict';
import test from 'node:test';

import cookie from '@fastify/cookie';
import fastify from 'fastify';

import { registerMediaRoutes } from './media';

test('Range on cache miss stores and serves the full derivative', async () => {
  const app = fastify();
  await app.register(cookie);

  const full = Buffer.from('full-derivative');
  let cached: Buffer | null = null;
  let objectReads = 0;
  registerMediaRoutes(app, {
    readSession: () => Promise.resolve({
      id: 'test',
      subject: 'test',
      groups: [],
      expiresAt: new Date(Date.now() + 60_000),
    }),
    prisma: {
      mediaAsset: {
        findUnique: () => Promise.resolve({
          status: 'ready',
          derivatives: [{ objectKey: 'derivatives/test.jpeg' }],
        }),
      },
    } as never,
    cacheGet: () => Promise.resolve(cached),
    cachePut: (_key, value) => {
      cached = Buffer.from(value);
      return Promise.resolve();
    },
    objectStore: {
      response: () => {
        objectReads += 1;
        return Promise.resolve(new Response(full, { headers: { 'Content-Type': 'image/jpeg' } }));
      },
    } as never,
  });

  const ranged = await app.inject({
    method: 'GET',
    url: '/media/test/jpeg/640',
    headers: { range: 'bytes=0-3' },
  });
  const complete = await app.inject({ method: 'GET', url: '/media/test/jpeg/640' });

  assert.equal(ranged.statusCode, 200);
  assert.equal(ranged.headers['content-type'], 'image/jpeg');
  assert.deepEqual(ranged.rawPayload, full);
  assert.equal(complete.statusCode, 200);
  assert.equal(complete.headers['content-type'], 'image/jpeg');
  assert.deepEqual(complete.rawPayload, full);
  assert.equal(objectReads, 1);

  await app.close();
});
