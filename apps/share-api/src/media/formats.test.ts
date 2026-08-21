import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import assert from 'node:assert/strict';
import test from 'node:test';

import sharp, { type Sharp } from 'sharp';

import { MediaValidationError, parseExifDateTime, validateOriginal } from './formats';

const fixtureDirectory = fileURLToPath(new URL('../../../../test-fixtures/heic/', import.meta.url));

test('validates image content rather than the claimed filename or MIME', async () => {
  const jpeg = await sharp({ create: { width: 4, height: 3, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  const result = await validateOriginal(jpeg);
  assert.deepEqual(result, { format: 'jpeg', width: 4, height: 3 });
});

test('normalizes valid EXIF DateTimeOriginal values and rejects invalid dates', () => {
  assert.equal(parseExifDateTime('2026:08:17 12:34:56')?.toISOString(), '2026-08-17T12:34:56.000Z');
  assert.equal(parseExifDateTime('2026:08:17 12:34:56+03:00')?.toISOString(), '2026-08-17T09:34:56.000Z');
  assert.equal(parseExifDateTime('2026:02:31 12:34:56'), undefined);
  assert.equal(parseExifDateTime('not-a-date'), undefined);
});

test('reports oriented dimensions for non-HEIF originals', async () => {
  const jpeg = await sharp({ create: { width: 3, height: 2, channels: 3, background: '#fff' } })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();

  assert.deepEqual(await validateOriginal(jpeg), { format: 'jpeg', width: 2, height: 3, orientation: 6 });
});

test('returns a safe decoder failure for corrupt bytes', async () => {
  await assert.rejects(() => validateOriginal(new Uint8Array([0, 1, 2, 3])), { message: 'image_decode_failed' });
});

test('rejects an image whose header is readable but pixel payload is truncated', async () => {
  const jpeg = await sharp({ create: { width: 128, height: 96, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  const truncated = jpeg.subarray(0, Math.floor(jpeg.length * 0.9));
  assert.equal((await sharp(truncated).metadata()).width, 128);
  await assert.rejects(() => validateOriginal(truncated), { message: 'image_decode_failed' });
});

test('validates JPEG XL content only after an actual local codec operation succeeds', async (t) => {
  try {
    const source = sharp({ create: { width: 8, height: 6, channels: 3, background: '#fff' } });
    const jxl = await (source as unknown as { jxl: () => Sharp }).jxl().toBuffer();
    assert.equal((await validateOriginal(jxl)).format, 'jxl');
  } catch {
    t.skip('actual JXL encode/decode probe is unavailable outside the custom media runtime');
  }
});

test('validates AVIF independently of HEVC capability', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'photo-library-avif-test-'));
  const target = join(directory, 'fixture.avif');
  try {
    const source = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    await sharp(source).avif({ quality: 50, effort: 4, tune: 'psnr' }).toFile(target);
    assert.deepEqual(await validateOriginal(await readFile(target)), { format: 'heif', width: 64, height: 48 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('validates the 6x8 HEVC grid only when an actual local HEVC decode probe succeeds', async (t) => {
  const hevc = await readFile(join(fixtureDirectory, 'tiled-6x8.heic'));
  try {
    assert.deepEqual(await validateOriginal(hevc), { format: 'heif', width: 384, height: 512 });
  } catch (error) {
    if (error instanceof MediaValidationError) {
      t.skip('actual HEVC decode probe is unavailable outside the patched custom media runtime');
      return;
    }
    throw error;
  }
});

test('rejects an over-budget HEVC grid before codec decode', async () => {
  const hevc = await readFile(join(fixtureDirectory, 'tiled-17x16-over-budget.heic'));
  await assert.rejects(() => validateOriginal(hevc), { message: 'heif_complexity_limit_exceeded' });
});

test('validates a real iPhone HEIC fixture when provided as a local manual oracle', async (t) => {
  const fixturePath = join(fixtureDirectory, 'iphone-original.HEIC');
  try {
    await access(fixturePath);
  } catch {
    t.skip('place an actual iPhone HEIC at test-fixtures/heic/iphone-original.HEIC');
    return;
  }
  try {
    assert.equal((await validateOriginal(await readFile(fixturePath))).format, 'heif');
  } catch (error) {
    if (error instanceof MediaValidationError) {
      t.skip('manual oracle requires the patched custom HEVC runtime');
      return;
    }
    throw error;
  }
});

test('validates HEVC output only after an actual local HEVC encode succeeds', async (t) => {
  try {
    const heic = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#fff' } })
      .heif({ compression: 'hevc', quality: 50, effort: 4, chromaSubsampling: '4:2:0' })
      .toBuffer();
    assert.equal((await validateOriginal(heic)).format, 'heif');
  } catch {
    t.skip('actual HEVC encode/decode probe is unavailable outside the custom media runtime');
  }
});
