import { expect, test, type Page, type TestInfo } from '@playwright/test';

const animationDuration = 6_000;
const sampleStep = 500;
const sampleCount = 10;

const photos = Array.from({ length: 4 }, (_, index) => ({
  id: `e2e-photo-${String(index + 1)}`,
  alt: `Synthetic frame ${String(index + 1)}`,
  width: index === 1 ? 1_000 : 1_600,
  height: index === 1 ? 1_600 : 1_000,
  capturedAt: '2026-08-22T10:00:00.000Z',
  frameIndex: index,
  derivatives: [{
    format: 'jpeg' as const,
    width: index === 1 ? 400 : 640,
    height: index === 1 ? 640 : 400,
    url: `/media/e2e-photo-${String(index + 1)}/jpeg/640`,
  }, {
    format: 'jpeg' as const,
    width: index === 1 ? 1_000 : 1_600,
    height: index === 1 ? 1_600 : 1_000,
    url: `/media/e2e-photo-${String(index + 1)}/jpeg/1600`,
  }, {
    format: 'jpeg' as const,
    width: 2_560,
    height: index === 1 ? 4_096 : 1_600,
    url: `/media/e2e-photo-${String(index + 1)}/jpeg/2560`,
  }],
}));

const album = {
  slug: 'e2e-album',
  title: 'Synthetic transition album',
  description: null,
  photos,
};

const syntheticSvg = (id: string, width: number, height: number): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(width)} ${String(height)}"><rect width="${String(width)}" height="${String(height)}" fill="#20252b"/><text x="${String(width / 2)}" y="${String(height / 2)}" fill="#f0dfc5" font-family="monospace" font-size="96" text-anchor="middle">${id}</text></svg>`;
};

const readSnapshot = async (page: Page, selectedLabel: string, side: 'left' | 'right') => page.evaluate(({ label, edge }) => {
  const toRect = (element: { getBoundingClientRect: () => DOMRect } | null) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
  };
  const toPx = (value: string) => Number.parseFloat(value.match(/-?\d+(?:\.\d+)?/)?.[0] ?? 'NaN');
  const clone = document.querySelector<HTMLElement>('[data-photo-viewer-animation="clone"]');
  const metadataElements = [...document.querySelectorAll<HTMLElement>('[aria-label="Frame metadata"]')];
  const compositionMetadata = metadataElements.find((element) => !element.closest('[data-photo-viewer-animation="clone"]')) ?? null;
  const composition = compositionMetadata?.closest<HTMLElement>('[data-photo-viewer-film="track"]') ?? null;
  const targetImage = composition?.querySelector('img') ?? null;
  const sourceAnchorButton = [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.getAttribute('aria-label') === label && !button.closest('[data-photo-viewer-animation="clone"]')) ?? null;
  const sourceImage = sourceAnchorButton?.querySelector('img') ?? null;
  const sourceFilm = sourceAnchorButton?.parentElement ?? null;
  const cloneAnchor = [...(clone?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    .find((button) => button.getAttribute('aria-label') === label) ?? null;
  const cloneBefore = clone ? getComputedStyle(clone, '::before') : null;
  const compositionBefore = composition ? getComputedStyle(composition, '::before') : null;
  const cloneRect = toRect(clone);
  const compositionRect = toRect(composition);
  const anchorRect = toRect(cloneAnchor);
  const metadataRect = toRect(clone?.querySelector('[aria-label="Frame metadata"]') ?? null);
  const metadataElement = clone?.querySelector<HTMLElement>('[aria-label="Frame metadata"]') ?? null;
  const metadataStyle = metadataElement ? getComputedStyle(metadataElement) : null;
  const metadataTextRange = metadataElement ? document.createRange() : null;
  if (metadataTextRange && metadataElement) metadataTextRange.selectNodeContents(metadataElement);
  const metadataTextRect = metadataTextRange ? toRect(metadataTextRange) : null;
  const viewportRect = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const intersectsViewport = (rect: ReturnType<typeof toRect>) => Boolean(
    rect
    && Math.min(rect.right, viewportRect.right) - Math.max(rect.left, viewportRect.left) > 1
    && Math.min(rect.bottom, viewportRect.bottom) - Math.max(rect.top, viewportRect.top) > 1,
  );
  const metadataVisibleItemCount = metadataElement
    ? [...metadataElement.children].filter((item) => {
      const range = document.createRange();
      range.selectNodeContents(item);
      return intersectsViewport(toRect(range));
    }).length
    : 0;
  const metadataTextVisible = Boolean(
    metadataRect
    && metadataTextRect
    && Math.min(metadataRect.right, metadataTextRect.right, viewportRect.right) - Math.max(metadataRect.left, metadataTextRect.left, viewportRect.left) > 1
    && Math.min(metadataRect.bottom, metadataTextRect.bottom, viewportRect.bottom) - Math.max(metadataRect.top, metadataTextRect.top, viewportRect.top) > 1,
  );
  const transformScale = clone ? Number.parseFloat(getComputedStyle(clone).transform.match(/^matrix\((-?\d+(?:\.\d+)?)/)?.[1] ?? '1') : 1;
  const cloneBorderRadius = clone ? Number.parseFloat(getComputedStyle(clone).borderTopLeftRadius) : Number.NaN;
  const cloneBorderWidth = clone ? Number.parseFloat(getComputedStyle(clone).borderLeftWidth) || 0 : Number.NaN;
  const cloneGradientPixels = cloneBefore
    ? [...cloneBefore.backgroundImage.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]))
    : [];
  const cloneHoleWidth = cloneGradientPixels.length >= 2 ? cloneGradientPixels[1] : Number.NaN;
  const compositionGradientPixels = compositionBefore
    ? [...compositionBefore.backgroundImage.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]))
    : [];
  const compositionHoleWidth = compositionGradientPixels.length >= 2 ? compositionGradientPixels[1] : Number.NaN;
  const settledMetadataRect = toRect(compositionMetadata);
  const perforationAnchorDistance = cloneRect && cloneBefore && anchorRect && Number.isFinite(cloneHoleWidth)
    ? cloneRect.left
      + cloneBorderWidth * transformScale
      + toPx(cloneBefore.backgroundPosition) * transformScale
      + cloneHoleWidth * transformScale / 2
      - (anchorRect.left + anchorRect.width / 2)
    : Number.NaN;
  const settledPerforationAnchorDistance = composition && compositionRect && compositionBefore && targetImage && Number.isFinite(compositionHoleWidth)
    ? compositionRect.left
      + (Number.parseFloat(getComputedStyle(composition).borderLeftWidth) || 0)
      + toPx(compositionBefore.backgroundPosition)
      + compositionHoleWidth / 2
      - ((toRect(targetImage)?.left ?? Number.NaN) + (toRect(targetImage)?.width ?? Number.NaN) / 2)
    : Number.NaN;
  return {
    progress: Number(clone?.dataset.photoViewerProgress ?? 'NaN'),
    clone: cloneRect,
    composition: compositionRect,
    anchor: anchorRect,
    source: toRect(sourceImage),
    target: toRect(targetImage),
    cloneScale: transformScale,
    sourceImageBorderRadius: sourceImage ? getComputedStyle(sourceImage).borderRadius : 'missing',
    sourceFilmBorderRadius: sourceFilm ? getComputedStyle(sourceFilm).borderRadius : 'missing',
    targetImageBorderRadius: targetImage ? getComputedStyle(targetImage).borderRadius : 'missing',
    targetFilmBorderRadius: composition ? getComputedStyle(composition).borderRadius : 'missing',
    cloneVisualBorderRadius: cloneBorderRadius * transformScale,
    metadata: {
      opacity: metadataStyle ? Number.parseFloat(metadataStyle.opacity) : Number.NaN,
      visibility: metadataStyle ? metadataStyle.visibility : 'missing',
      rect: metadataRect,
      textVisible: metadataTextVisible,
      visibleItemCount: metadataVisibleItemCount,
      edgeDistance: metadataRect && cloneRect
        ? edge === 'left' ? metadataRect.left - cloneRect.left : cloneRect.right - metadataRect.right
        : Number.NaN,
      visualFontSize: metadataStyle ? Number.parseFloat(metadataStyle.fontSize) * transformScale : Number.NaN,
    },
    settledMetadata: {
      opacity: compositionMetadata ? Number.parseFloat(getComputedStyle(compositionMetadata).opacity) : Number.NaN,
      visibility: compositionMetadata ? getComputedStyle(compositionMetadata).visibility : 'missing',
      rect: settledMetadataRect,
    },
    perforationAnchorDistance,
    settledPerforationAnchorDistance,
  };
}, { label: selectedLabel, edge: side });

const readNavigationSnapshot = async (page: Page) => page.evaluate(() => {
  const toRect = (element: Element | null) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
  };
  const track = document.querySelector<HTMLElement>('[data-photo-viewer-navigation]');
  const sections = [...(track?.querySelectorAll<HTMLElement>('[data-photo-viewer-section]') ?? [])];
  const snapshotSection = (section: HTMLElement | undefined) => {
    const rect = toRect(section ?? null);
    const image = section?.querySelector<HTMLImageElement>('img') ?? null;
    const imageRect = toRect(image);
    const metadata = section?.querySelector<HTMLElement>('[aria-label="Frame metadata"]') ?? null;
    const metadataRect = toRect(metadata);
    return {
      kind: section?.dataset.photoViewerSection ?? null,
      photoId: section?.dataset.photoId ?? null,
      rect,
      image: imageRect,
      imageOffset: rect && imageRect ? { left: imageRect.left - rect.left, top: imageRect.top - rect.top } : null,
      imageAspectRatio: imageRect && image?.naturalWidth && image.naturalHeight
        ? imageRect.width / imageRect.height - image.naturalWidth / image.naturalHeight
        : Number.NaN,
      metadata: metadataRect,
      metadataOffset: rect && metadataRect ? { left: metadataRect.left - rect.left, top: metadataRect.top - rect.top } : null,
      metadataText: metadata?.textContent ?? '',
    };
  };
  const trackRect = toRect(track);
  const before = track ? getComputedStyle(track, '::before') : null;
  const perforationOffset = Number.parseFloat(before?.backgroundPositionX ?? before?.backgroundPosition ?? 'NaN');
  return {
    direction: track?.dataset.photoViewerNavigation ?? null,
    progress: Number(track?.dataset.photoViewerNavigationProgress ?? 'NaN'),
    track: trackRect,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    perforationLocalOffset: perforationOffset,
    perforationPhysicalOffset: trackRect ? trackRect.left + perforationOffset : Number.NaN,
    sections: sections.map(snapshotSection),
  };
});

const openSettledViewer = async (page: Page, index = 0) => {
  const selectedLabel = `Frame ${String(index + 1)}: Synthetic frame ${String(index + 1)}`;
  await page.getByRole('button', { name: selectedLabel, exact: true }).click();
  await page.clock.runFor(animationDuration + 500);
  await expect(page.locator('[data-photo-viewer-animation="clone"]')).toHaveCount(0);
  await expect(page.locator('[data-photo-viewer-section="current"]')).toHaveAttribute('data-photo-id', photos[index].id);
};

const assertNavigation = async (
  page: Page,
  direction: 'next' | 'previous',
  currentIndex: number,
  testInfo: TestInfo,
) => {
  const targetIndex = direction === 'next'
    ? (currentIndex + 1) % photos.length
    : (currentIndex - 1 + photos.length) % photos.length;
  await page.getByRole('button', { name: direction === 'next' ? 'Next frame' : 'Previous frame' }).click();
  await expect(page.locator('[data-photo-viewer-section]')).toHaveCount(2);

  const samples = [];
  for (let elapsed = sampleStep; elapsed <= sampleStep * sampleCount; elapsed += sampleStep) {
    await page.clock.runFor(sampleStep);
    const snapshot = await readNavigationSnapshot(page);
    samples.push(snapshot);
    if (process.env.PHOTO_VIEWER_QA === '1') {
      await page.screenshot({ path: testInfo.outputPath(`${direction}-${String(elapsed).padStart(4, '0')}.png`) });
    }
  }

  expect(samples.length).toBe(sampleCount);
  for (const sample of samples) {
    expect(sample.direction).toBe(direction);
    expect(sample.sections).toHaveLength(2);
    expect(sample.track?.left ?? 1).toBeLessThanOrEqual(0.5);
    expect(sample.track?.right ?? -1).toBeGreaterThanOrEqual(sample.viewport.width - 0.5);
    expect(sample.track?.height ?? 0).toBeGreaterThan(0);
    const current = sample.sections.find((section) => section.kind === 'current');
    const target = sample.sections.find((section) => section.kind === 'target');
    expect(current?.photoId).toBe(photos[currentIndex].id);
    expect(target?.photoId).toBe(photos[targetIndex].id);
    expect(target?.metadataText).toContain(`Frame ${String(targetIndex + 1)}`);
    expect(Math.abs(current?.imageAspectRatio ?? 1)).toBeLessThan(0.01);
    expect(Math.abs(target?.imageAspectRatio ?? 1)).toBeLessThan(0.01);
  }
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const sign = direction === 'next' ? -1 : 1;
    expect(((current.track?.left ?? 0) - (previous.track?.left ?? 0)) * sign).toBeGreaterThan(0);
    for (const kind of ['current', 'target'] as const) {
      const previousSection = previous.sections.find((section) => section.kind === kind);
      const currentSection = current.sections.find((section) => section.kind === kind);
      expect(((currentSection?.rect?.left ?? 0) - (previousSection?.rect?.left ?? 0)) * sign).toBeGreaterThan(0);
      expect(Math.abs((currentSection?.imageOffset?.left ?? 0) - (previousSection?.imageOffset?.left ?? 0))).toBeLessThan(0.5);
      expect(Math.abs((currentSection?.metadataOffset?.left ?? 0) - (previousSection?.metadataOffset?.left ?? 0))).toBeLessThan(0.5);
    }
    expect(Math.abs(
      (current.perforationPhysicalOffset - previous.perforationPhysicalOffset)
      - ((current.track?.left ?? 0) - (previous.track?.left ?? 0)),
    )).toBeLessThan(0.5);
  }

  let finalAnimated = samples[samples.length - 1];
  for (let index = 0; index < 60 && finalAnimated.progress < 0.9997; index += 1) {
    await page.clock.runFor(16);
    const candidate = await readNavigationSnapshot(page);
    if (candidate.direction !== direction) break;
    finalAnimated = candidate;
  }
  expect(finalAnimated.direction).toBe(direction);
  expect(finalAnimated.progress).toBeGreaterThanOrEqual(0.9997);
  await page.clock.runFor(1_000);
  await expect(page.locator('[data-photo-viewer-section]')).toHaveCount(1);
  const settled = await page.locator('[data-photo-viewer-film="track"]').evaluate((track) => {
    const section = track.querySelector<HTMLElement>('[data-photo-viewer-section="current"]');
    const images = section?.querySelectorAll('img');
    const image = images?.[images.length - 1] ?? null;
    const metadata = section?.querySelector('[aria-label="Frame metadata"]') ?? null;
    const rect = (element: Element | null) => {
      const value = element?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom } : null;
    };
    const filmRect = track.getBoundingClientRect();
    const perforationOffset = Number.parseFloat(getComputedStyle(track, '::before').backgroundPositionX);
    return {
      film: rect(track),
      image: rect(image),
      metadata: rect(metadata),
      photoId: section?.dataset.photoId ?? null,
      perforationPhysicalOffset: filmRect.left + perforationOffset,
    };
  });
  const finalTarget = finalAnimated.sections.find((section) => section.kind === 'target');
  const finalVisibleFilm = finalAnimated.track ? {
    ...finalAnimated.track,
    left: Math.max(0, finalAnimated.track.left),
    right: Math.min(finalAnimated.viewport.width, finalAnimated.track.right),
  } : null;
  expect(settled.photoId).toBe(photos[targetIndex].id);
  expect(Math.abs(finalAnimated.perforationPhysicalOffset - settled.perforationPhysicalOffset)).toBeLessThan(0.5);
  for (const key of ['left', 'top', 'right', 'bottom'] as const) {
    expect(Math.abs((finalVisibleFilm?.[key] ?? 0) - (settled.film?.[key] ?? 0)), JSON.stringify({ finalAnimated, finalVisibleFilm, settled, key })).toBeLessThan(0.5);
    expect(Math.abs((finalTarget?.image?.[key] ?? 0) - (settled.image?.[key] ?? 0)), JSON.stringify({ finalTarget, settled, key })).toBeLessThan(0.5);
    expect(Math.abs((finalTarget?.metadata?.[key] ?? 0) - (settled.metadata?.[key] ?? 0)), JSON.stringify({ finalTarget, settled, key })).toBeLessThan(0.5);
  }
  return targetIndex;
};

const configureFixtures = async (page: Page, delayedFullPhotoId?: string) => {
  let releaseDelayedFull: () => void = () => undefined;
  const delayedFull = delayedFullPhotoId
    ? new Promise<void>((resolve) => { releaseDelayedFull = resolve; })
    : Promise.resolve();
  await page.addInitScript((duration) => {
    (window as Window & { __PHOTO_VIEWER_E2E_DURATION__?: number }).__PHOTO_VIEWER_E2E_DURATION__ = duration;
  }, animationDuration);
  await page.route('**/trpc/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ result: { data: { albums: [album] } } }]),
    });
  });
  await page.route('**/media/**', async (route) => {
    const url = route.request().url();
    const id = url.match(/e2e-photo-\d+/)?.[0] ?? 'synthetic';
    if (id === delayedFullPhotoId && url.endsWith('/1600')) await delayedFull;
    const derivative = photos.find((photo) => photo.id === id)?.derivatives.find((item) => url.endsWith(item.url));
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: syntheticSvg(id, derivative?.width ?? 1_600, derivative?.height ?? 1_000),
    });
  });
  return releaseDelayedFull;
};

const assertEdgeTransition = async (page: Page, selectedIndex: number, side: 'left' | 'right') => {
  const selectedLabel = `Frame ${String(selectedIndex + 1)}: Synthetic frame ${String(selectedIndex + 1)}`;
  await page.getByRole('button', { name: selectedLabel, exact: true }).click();
  await expect(page.locator('[data-photo-viewer-animation="clone"]')).toHaveCount(1);

  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    await page.clock.runFor(sampleStep);
    samples.push(await readSnapshot(page, selectedLabel, side));
  }
  let finalClone = samples[samples.length - 1];
  for (let index = 0; index < 60 && finalClone.progress < 0.9997; index += 1) {
    await page.clock.runFor(16);
    const candidate = await readSnapshot(page, selectedLabel, side);
    if (!Number.isFinite(candidate.progress)) break;
    finalClone = candidate;
  }

  expect(samples).toHaveLength(sampleCount);
  expect(samples.every((sample) => Number.isFinite(sample.progress))).toBe(true);
  for (const sample of samples) {
    expect(sample.clone).not.toBeNull();
    expect(sample.metadata.visibility).toBe('visible');
    expect(sample.metadata.textVisible).toBe(true);
    expect(sample.metadata.visibleItemCount).toBe(3);
    expect(sample.metadata.opacity).toBeGreaterThan(0);
    expect(sample.metadata.rect?.height ?? 0).toBeGreaterThan(0);
    expect(Number.isFinite(sample.metadata.edgeDistance)).toBe(true);
    expect(sample.metadata.edgeDistance).toBeGreaterThan(0);
    expect(Number.isFinite(sample.metadata.visualFontSize)).toBe(true);
    expect(sample.metadata.visualFontSize).toBeGreaterThan(0);
    expect(Number.isFinite(sample.cloneVisualBorderRadius)).toBe(true);
    expect(Number.parseFloat(sample.sourceFilmBorderRadius)).toBe(0);
    expect(Number.parseFloat(sample.targetFilmBorderRadius)).toBe(0);
    expect(Math.abs(
      Number.parseFloat(sample.targetImageBorderRadius)
      - Number.parseFloat(sample.sourceImageBorderRadius) * (sample.target?.width ?? 0) / (sample.source?.width ?? 1),
    ), JSON.stringify(sample)).toBeLessThan(0.5);
  }
  for (let index = 1; index < samples.length; index += 1) {
    expect(samples[index].progress).toBeGreaterThan(samples[index - 1].progress);
    expect(samples[index].metadata.opacity).toBeGreaterThanOrEqual(samples[index - 1].metadata.opacity);
    expect(samples[index].metadata.visualFontSize).toBeGreaterThan(samples[index - 1].metadata.visualFontSize);
    expect(samples[index].metadata.edgeDistance).toBeGreaterThan(samples[index - 1].metadata.edgeDistance);
  }
  expect(samples[0].metadata.opacity).toBeLessThan(samples[samples.length - 1].metadata.opacity);
  expect(Math.abs(finalClone.perforationAnchorDistance), JSON.stringify(finalClone)).toBeLessThan(0.75);
  expect(Math.abs(
    Number.parseFloat(finalClone.targetImageBorderRadius)
    - Number.parseFloat(finalClone.sourceImageBorderRadius) * (finalClone.target?.width ?? 0) / (finalClone.source?.width ?? 1),
  ), JSON.stringify(finalClone)).toBeLessThan(0.5);
  expect(Math.abs(finalClone.cloneVisualBorderRadius - Number.parseFloat(finalClone.targetFilmBorderRadius)), JSON.stringify(finalClone)).toBeLessThan(0.5);
  expect(finalClone.progress).toBeGreaterThan(0.98);
  expect(finalClone.metadata.opacity).toBeGreaterThan(0.98);
  expect(finalClone.metadata.rect?.height ?? 0).toBeGreaterThan(0);
  expect(Math.abs((finalClone.anchor?.left ?? 0) - (finalClone.target?.left ?? 0)), JSON.stringify(finalClone)).toBeLessThan(1);
  expect(Math.abs((finalClone.anchor?.right ?? 0) - (finalClone.target?.right ?? 0)), JSON.stringify(finalClone)).toBeLessThan(1);
  expect(Math.abs(finalClone.perforationAnchorDistance), JSON.stringify(finalClone)).toBeLessThan(0.75);
  if (side === 'left') {
    expect(Math.abs((finalClone.clone?.left ?? 0) - (finalClone.composition?.left ?? 0)), JSON.stringify(finalClone)).toBeLessThan(1);
  } else {
    expect(Math.abs((finalClone.clone?.right ?? 0) - (finalClone.composition?.right ?? 0)), JSON.stringify(finalClone)).toBeLessThan(1);
  }

  await page.clock.runFor(600);
  await expect(page.locator('[data-photo-viewer-animation="clone"]')).toHaveCount(0);
  const settled = await readSnapshot(page, selectedLabel, side);
  expect(settled.settledMetadata.visibility).toBe('visible');
  expect(settled.settledMetadata.opacity).toBeGreaterThan(0.98);
  expect(settled.settledMetadata.rect?.height ?? 0).toBeGreaterThan(0);
  expect(Math.abs(settled.settledPerforationAnchorDistance), JSON.stringify(settled)).toBeLessThan(0.75);
  expect(Math.abs(
    Number.parseFloat(settled.targetImageBorderRadius)
    - Number.parseFloat(settled.sourceImageBorderRadius) * (settled.target?.width ?? 0) / (settled.source?.width ?? 1),
  ), JSON.stringify(settled)).toBeLessThan(0.5);
  expect(Number.parseFloat(settled.targetFilmBorderRadius)).toBe(0);

  await page.getByRole('button', { name: 'Close viewer', exact: true }).click();
  await expect(page.locator('[data-photo-viewer-animation="clone"]')).toHaveCount(1);
  await page.clock.runFor(sampleStep);
  const closingClone = await readSnapshot(page, selectedLabel, side);
  expect(Number.isFinite(closingClone.cloneVisualBorderRadius)).toBe(true);
  await page.clock.runFor(animationDuration + 500);
  await expect(page.locator('[data-photo-viewer="open"]')).toHaveCount(0);
};

test('samples ten slow origin-linked frames and keeps captions, anchors, edges, and perforation aligned', async ({ page }) => {
  await configureFixtures(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Frame 1: Synthetic frame 1/ }).first()).toBeVisible();
  await page.clock.install();
  await expect.poll(() => page.evaluate(() => (window as Window & { __PHOTO_VIEWER_E2E_DURATION__?: number }).__PHOTO_VIEWER_E2E_DURATION__))
    .toBe(animationDuration);

  await assertEdgeTransition(page, 0, 'left');
  await assertEdgeTransition(page, photos.length - 1, 'right');
});

test('loads the 640 px candidate for a small gallery frame', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/media/')) requests.push(request.url());
  });
  await configureFixtures(page);
  await page.goto('/');

  const frame = page.getByRole('button', { name: /Frame 1: Synthetic frame 1/ }).first();
  await expect(frame).toBeVisible();
  await expect.poll(() => requests.some((url) => url.endsWith('/jpeg/640'))).toBe(true);
  expect(requests.some((url) => url.endsWith('/jpeg/2560'))).toBe(false);
  const responsive = await frame.locator('img').evaluate((element) => {
    const image = element as HTMLImageElement;
    return {
      sizes: Number.parseFloat(image.sizes),
      width: image.getBoundingClientRect().width,
      srcset: image.srcset,
    };
  });
  expect(responsive.srcset).toContain('640w');
  expect(responsive.srcset).toContain('1600w');
  expect(responsive.srcset).toContain('2560w');
  expect(Math.abs(responsive.sizes - responsive.width)).toBeLessThan(1);
});

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`moves one continuous film in both directions on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await configureFixtures(page);
    await page.goto('/');
    await page.clock.install();
    await openSettledViewer(page);
    const nextIndex = await assertNavigation(page, 'next', 0, testInfo);
    const originalIndex = await assertNavigation(page, 'previous', nextIndex, testInfo);
    expect(originalIndex).toBe(0);
  });
}

test('guards competing navigation and serializes close after handoff', async ({ page }) => {
  await configureFixtures(page);
  await page.goto('/');
  await page.clock.install();
  await openSettledViewer(page);

  await page.getByRole('button', { name: 'Next frame' }).click();
  await page.keyboard.press('ArrowRight');
  const stage = page.locator('[data-photo-viewer-stage="film"]');
  await stage.dispatchEvent('pointerdown', { clientX: 300 });
  await stage.dispatchEvent('pointerup', { clientX: 100 });
  await page.getByRole('button', { name: 'Next frame' }).click();
  await expect(page.locator('[data-photo-viewer-section="target"]')).toHaveAttribute('data-photo-id', photos[1].id);
  await page.clock.runFor(animationDuration + 32);
  await expect(page.locator('[data-photo-viewer-section="current"]')).toHaveAttribute('data-photo-id', photos[1].id);

  await page.getByRole('button', { name: 'Next frame' }).click();
  await page.clock.runFor(1_000);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-photo-viewer-navigation]')).toHaveCount(1);
  await page.clock.runFor(animationDuration * 2 + 1_000);
  await expect(page.locator('[data-photo-viewer="open"]')).toHaveCount(0);
});

test('uses instant reduced-motion navigation and keeps delayed preview visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const releaseDelayedFull = await configureFixtures(page, photos[1].id);
  await page.goto('/');
  await page.clock.install();
  await openSettledViewer(page);

  await page.getByRole('button', { name: 'Next frame' }).click();
  await page.clock.runFor(100);
  await expect(page.locator('[data-photo-viewer-navigation]')).toHaveCount(0);
  await expect(page.locator('[data-photo-viewer-section="current"]')).toHaveAttribute('data-photo-id', photos[1].id);
  await expect(page.locator('[data-photo-viewer-section="current"] img').first()).toBeVisible();
  releaseDelayedFull();
  await page.clock.runFor(200);
  await expect(page.locator('[data-photo-viewer-section="current"] img').first()).toBeVisible();
});
