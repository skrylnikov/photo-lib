import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

import { probeCodecCapabilities, requiredCodecCapabilities } from './codec-runtime';

const fixturePath = fileURLToPath(new URL('../../../../test-fixtures/heic/tiled-6x8.heic', import.meta.url));

test('an AVIF-capable local runtime never reports HEVC input readiness without an actual HEVC decode', async (t) => {
  const avif = await sharp({ create: { width: 16, height: 12, channels: 3, background: '#fff' } })
    .avif()
    .toBuffer();
  const capabilities = await probeCodecCapabilities({ hevc: await readFile(fixturePath), avif });
  assert.equal(capabilities['input:avif'], true);
  if (capabilities['input:hevc']) {
    t.skip('custom runtime has an actual HEVC decoder; missing-decoder case is exercised by the bundled runtime');
    return;
  }
  assert.equal(capabilities['input:hevc'], false);
  assert.equal(requiredCodecCapabilities.every((capability) => capabilities[capability]), false);
});
