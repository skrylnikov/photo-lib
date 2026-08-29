export const nextViewerIndex = (current: number, delta: number, count: number): number =>
  count > 0 ? (current + delta + count) % count : 0;

export type ViewerNavigationDirection = 'next' | 'previous';

export interface ViewerNavigation {
  direction: ViewerNavigationDirection;
  targetIndex: number;
}

export const startViewerNavigation = (
  currentIndex: number,
  direction: ViewerNavigationDirection,
  count: number,
  active: ViewerNavigation | null,
): ViewerNavigation | null => active || count < 2 ? null : {
  direction,
  targetIndex: nextViewerIndex(currentIndex, direction === 'next' ? 1 : -1, count),
};

export const viewerNavigationPerforationOffset = (
  currentOffset: number,
  viewportWidth: number,
  direction: ViewerNavigationDirection,
): number => direction === 'next' && Number.isFinite(viewportWidth)
  ? currentOffset - viewportWidth
  : currentOffset;

export const isViewerDerivativeReady = (
  decodedUrl: string | null,
  currentUrl: string | null | undefined,
): boolean => Boolean(currentUrl && decodedUrl === currentUrl);

export const viewerFilmBottomPadding = (
  perforationHeight: number,
  perforationInset: number,
  metadataGap: number,
): number => perforationHeight + perforationInset + metadataGap;

export interface ViewerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ViewerHorizontalViewport {
  left: number;
  right: number;
}

export type ViewerHorizontalSide = 'left' | 'right';

export const viewerOffscreenShift = (
  rect: ViewerRect | null | undefined,
  viewport: ViewerHorizontalViewport,
  side: ViewerHorizontalSide,
): number => {
  if (!isUsableViewerRect(rect) || !Number.isFinite(viewport.left) || !Number.isFinite(viewport.right)) return 0;
  return side === 'left'
    ? Math.min(0, viewport.left - (rect.left + rect.width))
    : Math.max(0, viewport.right - rect.left);
};

export const viewerFilmEdgeExpansion = (
  rect: ViewerRect | null | undefined,
  viewport: ViewerHorizontalViewport,
  side: ViewerHorizontalSide,
  scale: number,
): number => {
  if (!isUsableViewerRect(rect) || !Number.isFinite(viewport.left) || !Number.isFinite(viewport.right) || !Number.isFinite(scale) || scale <= 0) return 0;
  const viewportDistance = side === 'left'
    ? rect.left - viewport.left
    : viewport.right - (rect.left + rect.width);
  return Math.max(0, viewportDistance) / scale;
};

export const viewerSettledPerforationOffset = (
  animated: ViewerRect | null | undefined,
  settled: ViewerRect | null | undefined,
  animatedLocalOffset: number,
  scale: number,
  animatedBorderInset = 0,
  settledBorderInset = 0,
): number | null => {
  if (
    !isUsableViewerRect(animated)
    || !isUsableViewerRect(settled)
    || !Number.isFinite(animatedLocalOffset)
    || !Number.isFinite(scale)
    || scale <= 0
    || !Number.isFinite(animatedBorderInset)
    || !Number.isFinite(settledBorderInset)
  ) return null;
  return animated.left + animatedBorderInset + animatedLocalOffset * scale - settled.left - settledBorderInset;
};

export const viewerPerforationOffsetForAnchorCenter = (
  film: ViewerRect | null | undefined,
  anchor: ViewerRect | null | undefined,
  scale: number,
  holeWidth: number,
  borderInset = 0,
  anchorCenterOffset = 0,
): number | null => {
  if (
    !isUsableViewerRect(film)
    || !isUsableViewerRect(anchor)
    || !Number.isFinite(scale)
    || scale <= 0
    || !Number.isFinite(holeWidth)
    || holeWidth < 0
    || !Number.isFinite(borderInset)
    || !Number.isFinite(anchorCenterOffset)
  ) return null;
  const anchorCenter = anchor.left + anchor.width / 2 + anchorCenterOffset * scale;
  return (anchorCenter - film.left - borderInset * scale) / scale - holeWidth / 2;
};

export interface ViewerHandoffCorrection {
  translateY: number;
  height: number;
}

export interface ViewerNestedHandoffCorrection {
  translateX: number;
  translateY: number;
  paddingTop: number;
  height: number;
}

export const isUsableViewerRect = (rect: ViewerRect | null | undefined): rect is ViewerRect => Boolean(
  rect
  && Number.isFinite(rect.left)
  && Number.isFinite(rect.top)
  && Number.isFinite(rect.width)
  && Number.isFinite(rect.height)
  && rect.width > 0
  && rect.height > 0,
);

export const flipTransform = (source: ViewerRect | null | undefined, target: ViewerRect | null | undefined): string | null => {
  if (!isUsableViewerRect(source) || !isUsableViewerRect(target)) return null;
  return `translate(${String(source.left - target.left)}px, ${String(source.top - target.top)}px) scale(${String(source.width / target.width)}, ${String(source.height / target.height)})`;
};

export const viewerHandoffCorrection = (
  animated: ViewerRect | null | undefined,
  settled: ViewerRect | null | undefined,
): ViewerHandoffCorrection | null => {
  if (!isUsableViewerRect(animated) || !isUsableViewerRect(settled)) return null;
  return {
    translateY: settled.top - animated.top,
    height: settled.height - animated.height,
  };
};

export const viewerNestedHandoffCorrection = (
  animatedSurface: ViewerRect | null | undefined,
  settledSurface: ViewerRect | null | undefined,
  animatedAnchor: ViewerRect | null | undefined,
  settledAnchor: ViewerRect | null | undefined,
  scale: number,
): ViewerNestedHandoffCorrection | null => {
  if (
    !isUsableViewerRect(animatedSurface)
    || !isUsableViewerRect(settledSurface)
    || !isUsableViewerRect(animatedAnchor)
    || !isUsableViewerRect(settledAnchor)
    || !Number.isFinite(scale)
    || scale <= 0
  ) return null;
  const translateY = settledSurface.top - animatedSurface.top;
  return {
    translateX: settledAnchor.left - animatedAnchor.left,
    translateY,
    paddingTop: (settledAnchor.top - animatedAnchor.top - translateY) / scale,
    height: (settledSurface.height - animatedSurface.height) / scale,
  };
};

export const formatViewerDate = (value: string, locale?: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const viewerMetadata = (title: string, frameIndex: number, capturedAt: string, locale?: string) => ({
  title,
  frame: `Frame ${String(frameIndex + 1)}`,
  date: formatViewerDate(capturedAt, locale),
});
