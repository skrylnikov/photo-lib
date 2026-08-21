import { useState, type SyntheticEvent } from 'react';

import { photo } from '../../app/style.css.ts';

type PictureValue = {
  alt: string;
  derivatives: Array<{ format: string; width: number; url: string }>;
};

const sourceFormats = ['jxl', 'avif', 'heic', 'webp'] as const;
const fallbackFormats = ['jpeg', 'webp', 'avif', 'jxl'] as const;
const canonicalUrl = (url: string): string => new URL(url, window.location.href).href;

const bestFor = (value: PictureValue, format: string) => value.derivatives
  .filter((item) => item.format === format)
  .sort((left, right) => right.width - left.width)[0];

export const Picture = ({ value, className, sizes }: { value: PictureValue; className?: string; sizes?: string }) => {
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set());
  const failed = (url: string): boolean => failedUrls.has(canonicalUrl(url));
  const sources = sourceFormats
    .map((format) => ({ format, item: bestFor(value, format) }))
    .filter(({ item }) => item && !failed(item.url));
  const fallback = fallbackFormats
    .map((format) => bestFor(value, format))
    .find((item) => item && !failed(item.url));

  const onError = (event: SyntheticEvent<HTMLImageElement>): void => {
    const url = event.currentTarget.currentSrc || event.currentTarget.src;
    if (!url) return;
    setFailedUrls((current) => current.has(url) ? current : new Set([...current, url]));
  };

  if (!fallback) return <span role="img" aria-label={value.alt}>{value.alt}</span>;

  return <picture>
    {sources.map(({ format, item }) => item && <source key={format} srcSet={item.url} type={`image/${format}`} />)}
    <img className={className ?? photo} src={fallback.url} alt={value.alt} sizes={sizes} loading="lazy" onError={onError} />
  </picture>;
};
