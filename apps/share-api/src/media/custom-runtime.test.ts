import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

import { appConfig } from 'config';

import { codecVersionDiagnostics, probeInstalledCodecRuntime, requiredCodecCapabilities } from './codec-runtime';
import { boundedSharpInputOptions, derivativeFormats, MediaValidationError, validateOriginal } from './formats';
import { encodeDerivative, processOriginalBytes } from './processor';

const customRuntime = process.env.CUSTOM_MEDIA_RUNTIME === '1';
const fixtureDirectory = fileURLToPath(new URL('../../../../test-fixtures/heic/', import.meta.url));

const corruptMediaData = (value: Buffer): Buffer => {
  const corrupted = Buffer.from(value);
  let offset = 0;
  while (offset + 8 <= corrupted.length) {
    const size = corrupted.readUInt32BE(offset);
    const type = corrupted.subarray(offset + 4, offset + 8).toString('ascii');
    if (size < 8 || offset + size > corrupted.length) break;
    if (type === 'mdat') {
      corrupted.fill(0, offset + 8, offset + size);
      return corrupted;
    }
    offset += size;
  }
  throw new Error('fixture_mdat_missing');
};

test('custom runtime processes bounded tiled HEVC and rejects unsafe or corrupt variants', { skip: !customRuntime }, async () => {
  await mkdir(appConfig.tmpPath, { recursive: true });
  const original = await readFile(joinFixture('tiled-6x8.heic'));
  const originalHash = createHash('sha256').update(original).digest('hex');
  const overBudget = await readFile(joinFixture('tiled-17x16-over-budget.heic'));

  const [versions, capabilities] = await Promise.all([
    codecVersionDiagnostics(),
    probeInstalledCodecRuntime(original),
  ]);
  assert.equal(versions.libheif, '1.23.1');
  assert.equal(versions.libvips, '8.18.3');
  assert.equal(requiredCodecCapabilities.every((capability) => capabilities[capability]), true);
  assert.deepEqual(await validateOriginal(original), { format: 'heif', width: 384, height: 512 });

  const resized = await sharp(original, boundedSharpInputOptions())
    .resize({ width: 128, fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.deepEqual({ width: resized.info.width, height: resized.info.height }, { width: 128, height: 171 });

  await assert.rejects(() => validateOriginal(overBudget), { message: 'heif_complexity_limit_exceeded' });
  await assert.rejects(() => validateOriginal(corruptMediaData(original)), { message: 'image_decode_failed' });

  const events: string[] = [];
  await processOriginalBytes(
    original,
    async (derivative) => {
      const metadata = await sharp(derivative.value, boundedSharpInputOptions()).metadata();
      const expectedWidth = Math.min(derivative.width, 384);
      assert.equal(metadata.width, expectedWidth, `${derivative.format} width`);
      assert.equal(metadata.height, Math.round((expectedWidth * 4) / 3), `${derivative.format} height`);
      events.push(`derivative:${String(derivative.width)}:${derivative.format}`);
    },
    (_validated, derivatives) => {
      assert.equal(derivatives.length, derivativeFormats.length * 3);
      assert.equal(events.length, derivatives.length);
      events.push('ready');
      return Promise.resolve();
    },
  );
  assert.equal(events.at(-1), 'ready');
  assert.equal(createHash('sha256').update(original).digest('hex'), originalHash);
});

test('missing HEVC decoder remains a safe validation failure', { skip: !customRuntime }, async () => {
  const original = await readFile(joinFixture('tiled-6x8.heic'));
  const metadata = await sharp(original, boundedSharpInputOptions()).metadata();
  assert.equal(metadata.format, 'heif');
  const unavailableDecoder = (): Promise<void> => Promise.reject(new Error('native decoder detail must not escape'));
  const events: string[] = [];
  await assert.rejects(
    () =>
      processOriginalBytes(
        original,
        () => {
          events.push('derivative');
          return Promise.resolve();
        },
        () => {
          events.push('ready');
          return Promise.resolve();
        },
        (value) => validateOriginal(value, unavailableDecoder),
      ),
    (error: unknown) => error instanceof MediaValidationError && error.safeCode === 'image_decode_failed',
  );
  assert.deepEqual(events, []);
});

function joinFixture(name: string): string {
  return `${fixtureDirectory}${name}`;
}

test('normalizes EXIF orientation for non-HEIF derivatives', async () => {
  const base = await sharp({ create: { width: 3, height: 2, channels: 3, background: '#4f46e5' } }).jpeg().toBuffer();
  const original = withExifOrientation(base, 6);

  assert.deepEqual(await validateOriginal(original), { format: 'jpeg', width: 2, height: 3, orientation: 6 });
  const derivative = await encodeDerivative(original, 'jpeg', 640, 'jpeg', 6);
  const pixels = await sharp(derivative.value).raw().toBuffer({ resolveWithObject: true });

  assert.deepEqual({ width: pixels.info.width, height: pixels.info.height }, { width: 2, height: 3 });
});

function withExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00,
    0x00, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00,
  ]);
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1, 0x00, 0x22]),
    Buffer.from('Exif\0\0', 'ascii'),
    tiff,
  ]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}
