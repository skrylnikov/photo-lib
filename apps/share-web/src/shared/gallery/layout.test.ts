import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicPhoto } from 'types';

import { buildJustifiedRows, formatAllFrames, formatFrameCount } from './layout';
import { nextViewerIndex } from '../ui/viewer-state';

const photo = (id: string, width: number, height: number): PublicPhoto => ({
  id,
  alt: id,
  width,
  height,
  capturedAt: '2026-08-18T10:00:00.000Z',
  frameIndex: Number(id.slice(-1)),
  derivatives: [],
});

test('justified rows preserve order, frame indices, and intrinsic aspect ratios', () => {
  const rows = buildJustifiedRows([
    photo('photo-0', 1600, 900),
    photo('photo-1', 900, 1600),
    photo('photo-2', 1200, 800),
  ], 900, 200);
  const items = rows.flatMap((row) => row.items);
  assert.deepEqual(items.map((item) => item.id), ['photo-0', 'photo-1', 'photo-2']);
  assert.deepEqual(items.map((item) => item.frameIndex), [0, 1, 2]);
  for (const item of items) assert.ok(Math.abs(item.renderWidth / item.renderHeight - item.width / item.height) < 0.001);
});

test('every row is independent LTR and stays inside its available width', () => {
  const gap = 8;
  const width = 320;
  const rows = buildJustifiedRows([
    photo('photo-0', 4, 3),
    photo('photo-1', 3, 4),
    photo('photo-2', 4, 3),
    photo('photo-3', 2, 3),
  ], width, 160, gap);
  assert.ok(rows.length >= 2);
  assert.ok(rows.every((row) => !('direction' in row)));
  assert.deepEqual(rows.flatMap((row) => row.items).map((item) => item.frameIndex), [0, 1, 2, 3]);
  assert.ok(rows.every((row) => {
    const contentWidth = row.items.reduce((sum, item) => sum + item.renderWidth, 0) + gap * Math.max(0, row.items.length - 1);
    return contentWidth <= width + 0.001;
  }));
});

test('album header uses Russian frame counts', () => {
  assert.equal(formatFrameCount(1), '1 кадр');
  assert.equal(formatFrameCount(2), '2 кадра');
  assert.equal(formatFrameCount(5), '5 кадров');
  assert.equal(formatFrameCount(11), '11 кадров');
  assert.equal(formatFrameCount(21), '21 кадр');
  assert.equal(formatFrameCount(1, true), '1 избранный кадр');
  assert.equal(formatFrameCount(2, true), '2 избранных кадра');
  assert.equal(formatFrameCount(5, true), '5 избранных кадров');
  assert.equal(formatAllFrames(12), 'Все 12 кадров →');
});

test('viewer navigation wraps through the ordered album list', () => {
  assert.equal(nextViewerIndex(0, -1, 4), 3);
  assert.equal(nextViewerIndex(3, 1, 4), 0);
  assert.equal(nextViewerIndex(1, 1, 0), 0);
});
