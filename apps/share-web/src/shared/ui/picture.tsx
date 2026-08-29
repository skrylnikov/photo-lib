import { useState, type SyntheticEvent } from 'react';

import { photo } from '../../app/style.css.ts';
import { buildSrcSet } from './picture-srcset';

type PictureValue = {
  alt: string;
  derivatives: Array<{ format: string; width: number; url: string }>;
};

const sourceFormats = ['jxl', 'avif', 'heic', 'webp'] as const;
const fallbackFormats = ['jpeg', 'webp', 'avif', 'jxl'] as const;
const canonicalUrl = (url: string): string => new URL(url, window.location.href).href;

const candidatesFor = (value: PictureValue, format: string) => value.derivatives
  .filter((item) => item.format === format)
  .sort((left, right) => left.width - right.width);

export const Picture = ({ value, className, sizes }: { value: PictureValue; className?: string; sizes?: string }) => {
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set());
  const failed = (url: string): boolean => failedUrls.has(canonicalUrl(url));
  const sources = sourceFormats
    .map((format) => ({ format, items: candidatesFor(value, format).filter((item) => !failed(item.url)) }))
    .filter(({ items }) => items.length > 0);
  const fallback = fallbackFormats
    .map((format) => candidatesFor(value, format).filter((item) => !failed(item.url)))
    .find((items) => items.length > 0);

  const onError = (event: SyntheticEvent<HTMLImageElement>): void => {
    const url = event.currentTarget.currentSrc || event.currentTarget.src;
    if (!url) return;
    setFailedUrls((current) => current.has(url) ? current : new Set([...current, url]));
  };

  if (!fallback) return <span role="img" aria-label={value.alt}>{value.alt}</span>;

  const fallbackItem = fallback[fallback.length - 1];

  return <picture>
    {sources.map(({ format, items }) => <source key={format} srcSet={buildSrcSet(items)} sizes={sizes} type={`image/${format}`} />)}
    <img className={className ?? photo} src={fallbackItem.url} srcSet={buildSrcSet(fallback)} alt={value.alt} sizes={sizes} loading="lazy" onError={onError} />
  </picture>;
};
