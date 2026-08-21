export const nextViewerIndex = (current: number, delta: number, count: number): number =>
  count > 0 ? (current + delta + count) % count : 0;

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
