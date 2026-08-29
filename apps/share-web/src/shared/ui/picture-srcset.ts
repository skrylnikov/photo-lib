export const buildSrcSet = (
  derivatives: Array<{ width: number; url: string }>,
): string => [...derivatives]
  .sort((left, right) => left.width - right.width)
  .map((item) => `${item.url} ${String(item.width)}w`)
  .join(', ');
