import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { PublicPhoto } from 'types';

import { Picture } from '../ui/picture';
import { buildJustifiedRows, formatFrameCount, type JustifiedRow } from './layout';
import * as styles from './film.css.ts';

export const FilmGallery = ({
  title,
  photos,
  action,
  countLabel,
  headingLevel = 2,
  onOpen,
}: {
  title: string;
  photos: readonly PublicPhoto[];
  action?: ReactNode;
  countLabel?: string;
  headingLevel?: 1 | 2;
  onOpen: (index: number, origin: HTMLButtonElement, source: HTMLElement) => void;
}) => {
  const filmBodyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const headingId = useId();
  useEffect(() => {
    const element = filmBodyRef.current;
    if (!element) return undefined;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Include the row border in the measured content budget so rounded CSS
  // lines do not acquire a hidden 2px overflow at either breakpoint.
  const horizontalPadding = width <= 640 ? 18 : 30;
  const rows = buildJustifiedRows(
    photos,
    Math.max(0, width - horizontalPadding),
    width <= 640 ? 130 : 180,
  );
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return <section className={styles.gallery} aria-labelledby={headingId}>
    <div className={styles.backdrop}>
      <header className={styles.header}>
        <div>
          <Heading id={headingId} className={styles.title}>{title}</Heading>
          <p className={styles.count}>{countLabel ?? formatFrameCount(photos.length)}</p>
        </div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </header>
      <div ref={filmBodyRef} className={styles.filmBody}>
        {rows.map((row, rowIndex) => <FilmRow
          key={`${String(rowIndex)}-${row.items[0]?.id ?? 'empty'}`}
          row={row}
          onOpen={onOpen}
        />)}
      </div>
    </div>
  </section>;
};

const FilmRow = ({
  row,
  onOpen,
}: {
  row: JustifiedRow;
  onOpen: (index: number, origin: HTMLButtonElement, source: HTMLElement) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  return <div ref={rowRef} className={`${styles.filmSurface} ${styles.row}`}>
    {row.items.map((photo) => <button
      key={photo.id}
      type="button"
      className={styles.frame}
      style={{ width: photo.renderWidth, height: photo.renderHeight }}
      aria-label={`Frame ${String(photo.frameIndex + 1)}: ${photo.alt}`}
      onClick={(event) => onOpen(photo.frameIndex, event.currentTarget, rowRef.current ?? event.currentTarget)}
    >
      <Picture value={photo} className={styles.image} sizes={`${String(photo.renderWidth)}px`} />
    </button>)}
  </div>;
};
