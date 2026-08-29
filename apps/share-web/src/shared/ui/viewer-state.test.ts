import assert from 'node:assert/strict';
import test from 'node:test';

import {
  flipTransform,
  formatViewerDate,
  isUsableViewerRect,
  isViewerDerivativeReady,
  startViewerNavigation,
  viewerFilmBottomPadding,
  viewerFilmEdgeExpansion,
  viewerHandoffCorrection,
  viewerMetadata,
  viewerNestedHandoffCorrection,
  viewerNavigationPerforationOffset,
  viewerOffscreenShift,
  viewerPerforationOffsetForAnchorCenter,
  viewerSettledPerforationOffset,
} from './viewer-state';

test('viewer navigation wraps once and ignores competing input', () => {
  assert.deepEqual(startViewerNavigation(3, 'next', 4, null), { direction: 'next', targetIndex: 0 });
  assert.deepEqual(startViewerNavigation(0, 'previous', 4, null), { direction: 'previous', targetIndex: 3 });
  assert.equal(
    startViewerNavigation(0, 'next', 4, { direction: 'previous', targetIndex: 3 }),
    null,
  );
  assert.equal(startViewerNavigation(0, 'next', 1, null), null);
});

test('navigation carries the visible perforation phase into the settled film', () => {
  assert.equal(viewerNavigationPerforationOffset(17.5, 1280, 'next'), -1262.5);
  assert.equal(viewerNavigationPerforationOffset(17.5, 1280, 'previous'), 17.5);
});

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

test('neighboring frames move exactly to the viewport edge', () => {
  const viewport = { left: 0, right: 1000 };
  assert.equal(viewerOffscreenShift({ left: 40, top: 0, width: 160, height: 100 }, viewport, 'left'), -200);
  assert.equal(viewerOffscreenShift({ left: 800, top: 0, width: 160, height: 100 }, viewport, 'right'), 200);
  assert.equal(viewerOffscreenShift({ left: -240, top: 0, width: 160, height: 100 }, viewport, 'left'), 0);
  assert.equal(viewerOffscreenShift({ left: 1040, top: 0, width: 160, height: 100 }, viewport, 'right'), 0);
});

test('edge film expansion reaches the viewport edge in local coordinates', () => {
  const viewport = { left: 0, right: 1000 };
  assert.equal(viewerFilmEdgeExpansion({ left: 40, top: 0, width: 600, height: 100 }, viewport, 'left', 4), 10);
  assert.equal(viewerFilmEdgeExpansion({ left: 200, top: 0, width: 600, height: 100 }, viewport, 'right', 2), 100);
  assert.equal(viewerFilmEdgeExpansion({ left: -40, top: 0, width: 600, height: 100 }, viewport, 'left', 4), 0);
});

test('settled film uses the animated perforation phase', () => {
  const animated = { left: 127.25, top: 0, width: 1200, height: 100 };
  const settled = { left: 128, top: 0, width: 1200, height: 100 };
  assert.equal(viewerSettledPerforationOffset(animated, settled, 0, 4), -0.75);
  assert.equal(viewerSettledPerforationOffset(animated, settled, 2, 4), 7.25);
  assert.equal(viewerSettledPerforationOffset(animated, settled, 0, 4, 0.25, 1), -1.5);
  assert.equal(viewerSettledPerforationOffset(null, settled, 0, 4), null);
});

test('perforation phase centers a hole on the selected photo', () => {
  const film = { left: 100, top: 0, width: 800, height: 100 };
  const anchor = { left: 300, top: 0, width: 200, height: 80 };
  const offset = viewerPerforationOffsetForAnchorCenter(film, anchor, 2, 20, 1);
  assert.equal(offset, 139);
  assert.equal(viewerPerforationOffsetForAnchorCenter(null, anchor, 2, 20), null);
});
