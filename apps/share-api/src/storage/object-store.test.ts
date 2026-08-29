import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { objectStore } from './object-store';

test('RustFS object-store smoke test', { skip: process.env.RUSTFS_SMOKE_TEST !== '1' }, async () => {
  const prefix = `smoke/${randomUUID()}`;
  const key = `${prefix}/single.bin`;
  const presignedKey = `${prefix}/presigned.bin`;
  const multipartKey = `${prefix}/multipart.bin`;
  const value = new TextEncoder().encode('photo-library-smoke');
  const multipart = new Uint8Array(5 * 1024 * 1024 + 7).fill(7);
  try {
    await objectStore.put(key, value, 'application/octet-stream', value.byteLength);
    assert.equal(await objectStore.exists(key), true);
    assert.equal(await objectStore.size(key), value.byteLength);
    const response = await objectStore.response(key);
    assert.ok(response);
    assert.equal((await response.arrayBuffer()).byteLength, value.byteLength);

    const uploadUrl = await objectStore.presignPut(presignedKey, 'application/octet-stream');
    const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: value });
    assert.equal(uploadResponse.ok, true);
    assert.equal(await objectStore.exists(presignedKey), true);

    await objectStore.multipartPut(multipartKey, multipart, 'application/octet-stream');
    assert.equal(await objectStore.size(multipartKey), multipart.byteLength);
  } finally {
    await Promise.all([key, presignedKey, multipartKey].map((item) => objectStore.remove(item).catch(() => undefined)));
  }
});
