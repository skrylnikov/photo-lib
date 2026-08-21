import type { PublicPhoto } from 'types';

export type FilmPhoto = PublicPhoto & {
  renderWidth: number;
  renderHeight: number;
};

export const formatFrameCount = (count: number): string => `${String(count)} ${count === 1 ? 'frame' : 'frames'}`;

export interface JustifiedRow {
  items: FilmPhoto[];
  height: number;
}

const ratioOf = (photo: PublicPhoto): number => {
  if (!Number.isFinite(photo.width) || !Number.isFinite(photo.height) || photo.width <= 0 || photo.height <= 0) return 1;
  return photo.width / photo.height;
};

export const buildJustifiedRows = (
  photos: readonly PublicPhoto[],
  containerWidth: number,
  targetHeight = 220,
  gap = 8,
): JustifiedRow[] => {
  if (photos.length === 0 || containerWidth <= 0) return [];
  const rows: JustifiedRow[] = [];
  let offset = 0;

  while (offset < photos.length) {
    const start = offset;
    let aspectSum = 0;
    let count = 0;
    let estimatedHeight = targetHeight;
    while (offset < photos.length) {
      aspectSum += ratioOf(photos[offset]);
      count += 1;
      estimatedHeight = (containerWidth - gap * (count - 1)) / aspectSum;
      offset += 1;
      const isLastPhoto = offset === photos.length;
      if (isLastPhoto || estimatedHeight <= targetHeight || count >= 5) break;
    }

    // Never inflate a row after the fit calculation: doing so would make the
    // sum of intrinsic frame widths larger than the available line width on
    // narrow screens. The final row may have fewer items; its film surface
    // hugs that content instead of reserving an empty trailing area.
    const height = Math.min(targetHeight, estimatedHeight);
    const items = photos.slice(start, offset).map((photo) => ({
      ...photo,
      renderHeight: height,
      renderWidth: ratioOf(photo) * height,
    }));
    rows.push({ items, height });
  }
  return rows;
};
