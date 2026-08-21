import assert from 'node:assert/strict';
import test from 'node:test';

import {
  flipTransform,
  formatViewerDate,
  isUsableViewerRect,
  isViewerDerivativeReady,
  viewerFilmBottomPadding,
  viewerHandoffCorrection,
  viewerMetadata,
  viewerNestedHandoffCorrection,
} from './viewer-state';

test('viewer metadata contains only album title, frame number, and effective date', () => {
  assert.deepEqual(viewerMetadata('Summer album', 2, 'not-a-date'), {
    title: 'Summer album',
    frame: 'Frame 3',
    date: 'Date unavailable',
  });
  assert.match(formatViewerDate('2026-08-18T10:00:00.000Z', 'en-US'), /2026/);
});

test('origin-linked transition falls back when either rect is unavailable', () => {
  const source = { left: 20, top: 30, width: 120, height: 80 };
  const target = { left: 200, top: 180, width: 600, height: 400 };
  assert.ok(isUsableViewerRect(source));
  assert.equal(isUsableViewerRect({ ...source, width: 0 }), false);
  assert.equal(flipTransform(null, target), null);
  assert.equal(flipTransform(source, null), null);
  assert.equal(flipTransform(source, target), 'translate(-180px, -150px) scale(0.2, 0.2)');
});

test('full derivative readiness is scoped to the current URL', () => {
  assert.equal(isViewerDerivativeReady('/media/frame-1.jpeg', '/media/frame-1.jpeg'), true);
  assert.equal(isViewerDerivativeReady('/media/frame-1.jpeg', '/media/frame-2.jpeg'), false);
  assert.equal(isViewerDerivativeReady('/media/frame-1.jpeg', null), false);
  assert.equal(isViewerDerivativeReady(null, '/media/frame-1.jpeg'), false);
});

test('handoff correction aligns fractional top and bottom edges', () => {
  const animated = { left: 0, top: 180.75, width: 1200, height: 420.25 };
  const settled = { left: 0, top: 180.2, width: 1200, height: 420.9 };
  const correction = viewerHandoffCorrection(animated, settled);
  assert.ok(correction);
  assert.equal(animated.top + correction.translateY, settled.top);
  assert.equal(animated.height + correction.height, settled.height);
  assert.ok(Math.abs(
    animated.top + correction.translateY + animated.height + correction.height - (settled.top + settled.height),
  ) < 1e-9);
  assert.equal(viewerHandoffCorrection(null, settled), null);
});

test('nested handoff keeps the film surface and photo anchor aligned independently', () => {
  const animatedSurface = { left: -240, top: 179.5, width: 2100, height: 425 };
  const settledSurface = { left: 0, top: 181, width: 1280, height: 420 };
  const animatedAnchor = { left: 139.4, top: 224.8, width: 1000, height: 300 };
  const settledAnchor = { left: 140, top: 222, width: 1000, height: 300 };
  const correction = viewerNestedHandoffCorrection(
    animatedSurface,
    settledSurface,
    animatedAnchor,
    settledAnchor,
    5,
  );
  assert.ok(correction);
  assert.ok(Math.abs(correction.translateX - 0.6) < 1e-9);
  assert.equal(correction.translateY, 1.5);
  assert.ok(Math.abs(correction.paddingTop + 0.86) < 1e-9);
  assert.equal(correction.height, -1);
  assert.equal(viewerNestedHandoffCorrection(null, settledSurface, animatedAnchor, settledAnchor, 5), null);
  assert.equal(viewerNestedHandoffCorrection(animatedSurface, settledSurface, animatedAnchor, settledAnchor, 0), null);
});

test('viewer metadata gap stays fixed outside scaled perforation geometry', () => {
  assert.equal(viewerFilmBottomPadding(24, 6, 4), 34);
  assert.equal(viewerFilmBottomPadding(18, 4, 3), 25);
  assert.equal(viewerFilmBottomPadding(10 * 3, 3 * 3, 4), 43);
});
