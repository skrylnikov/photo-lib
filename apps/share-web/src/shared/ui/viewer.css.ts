import { createVar, globalStyle, style } from '@vanilla-extract/css';

import {
  filmPaddingBottom,
  filmPaddingInline,
  filmPaddingTop,
  filmPerforationColor,
  filmPerforationHeight,
  filmPerforationHoleWidth,
  filmPerforationInset,
  filmPerforationOffset,
  filmPerforationStep,
  filmRadius,
} from '../gallery/film.css.ts';

export const viewerMetadataPerforationGap = createVar();

export const backdrop = style({
  position: 'fixed',
  zIndex: 20,
  inset: 0,
  display: 'grid',
  gridTemplateRows: 'auto 1fr auto',
  minWidth: 0,
  padding: 'clamp(14px, 3vw, 32px)',
  color: '#382d26',
  backgroundColor: 'rgba(239, 234, 225, 0)',
  backdropFilter: 'none',
  transition: 'background-color 520ms cubic-bezier(.2,.75,.25,1)',
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});

export const backdropSettled = style({
  backgroundColor: '#efeae1',
});

export const backdropClosing = style({
  pointerEvents: 'none',
});

export const toolbar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minWidth: 0,
});

export const control = style({
  minWidth: 44,
  minHeight: 44,
  border: '1px solid rgba(73, 56, 43, .38)',
  borderRadius: 999,
  color: '#382d26',
  background: 'rgba(255, 255, 255, .42)',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: 'rgba(255, 255, 255, .8)' },
    '&:focus-visible': { outline: '3px solid #ef765c', outlineOffset: 3 },
  },
});

export const stage = style({
  display: 'grid',
  placeItems: 'center',
  width: 'calc(100% + clamp(28px, 6vw, 64px))',
  minWidth: 0,
  minHeight: 0,
  marginLeft: 'clamp(-32px, -3vw, -14px)',
  overflow: 'hidden',
  padding: '18px 0',
  touchAction: 'pan-y',
  perspective: 1200,
});

export const title = style({
  maxWidth: '40vw',
  minWidth: 0,
  overflow: 'hidden',
  color: '#6f4f3b',
  fontFamily: 'Film Hand, Bradley Hand, Chalkboard, cursive',
  fontSize: 'clamp(16px, 2vw, 24px)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const viewerFilm = style({
  display: 'flex',
  alignItems: 'stretch',
  width: '100vw',
  minWidth: '100vw',
  height: '100%',
  maxWidth: 'none',
  maxHeight: 'calc(100vh - 130px)',
  overflow: 'hidden',
  borderRadius: 0,
  boxShadow: 'none',
  transformStyle: 'preserve-3d',
  vars: {
    [filmRadius]: '0px',
    [filmPaddingTop]: '42px',
    [filmPaddingBottom]: `calc(${filmPerforationHeight} + ${filmPerforationInset} + ${viewerMetadataPerforationGap})`,
    [filmPaddingInline]: '44px',
    [filmPerforationHeight]: '24px',
    [filmPerforationHoleWidth]: '16px',
    [filmPerforationStep]: '30px',
    [filmPerforationColor]: 'rgba(239, 234, 225, .96)',
    [filmPerforationInset]: '6px',
    [filmPerforationOffset]: '0px',
    [viewerMetadataPerforationGap]: '4px',
  },
  '@media': {
    '(max-width: 640px)': {
      vars: {
        [filmPaddingTop]: '34px',
        [filmPaddingBottom]: `calc(${filmPerforationHeight} + ${filmPerforationInset} + ${viewerMetadataPerforationGap})`,
        [filmPaddingInline]: '18px',
        [filmPerforationHeight]: '18px',
        [filmPerforationHoleWidth]: '11px',
        [filmPerforationStep]: '22px',
        [filmPerforationInset]: '4px',
        [filmPerforationOffset]: '0px',
        [viewerMetadataPerforationGap]: '3px',
      },
    },
  },
});

export const viewerFilmMoving = style({
  width: '200vw',
  minWidth: '200vw',
  maxHeight: 'none',
  willChange: 'transform',
});

export const viewerSection = style({
  display: 'grid',
  flex: '0 0 100%',
  gridTemplateRows: 'minmax(0, 1fr) auto',
  justifyItems: 'center',
  minWidth: 0,
  minHeight: 0,
});

export const viewerSectionMoving = style({
  flexBasis: `calc(100vw - 2 * ${filmPaddingInline} - 2px)`,
  selectors: {
    '& + &': { marginLeft: `calc(2 * ${filmPaddingInline} + 2px)` },
  },
});

export const viewerFilmHidden = style({
  visibility: 'hidden',
});

export const sourceFilmHidden = style({
  visibility: 'hidden',
});

export const viewerWindow = style({
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  minHeight: 0,
  padding: 0,
  background: 'transparent',
  boxShadow: 'none',
});

export const image = style({
  display: 'block',
  maxWidth: '100%',
  maxHeight: 'var(--viewer-image-max-height, calc(100vh - 320px))',
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
  border: 0,
  borderRadius: 'var(--viewer-image-radius, 3px)',
  background: 'transparent',
  boxShadow: 'none',
  transform: 'scale(var(--viewer-zoom, 1))',
  transformOrigin: 'center center',
  transition: 'transform 160ms ease',
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
    '(max-width: 640px)': { maxHeight: 'var(--viewer-image-max-height, calc(100vh - 360px))' },
  },
});

export const imagePreview = style({
  gridArea: '1 / 1',
  zIndex: 1,
  width: 'min(var(--viewer-image-natural-width, 100%), 100%, calc(var(--viewer-image-max-height, calc(100vh - 320px)) * var(--viewer-image-aspect-ratio, 1)))',
  height: 'auto',
  maxWidth: '100%',
  maxHeight: 'var(--viewer-image-max-height, calc(100vh - 320px))',
  '@media': {
    '(max-width: 640px)': {
      width: 'min(var(--viewer-image-natural-width, 100%), 100%, calc(var(--viewer-image-max-height, calc(100vh - 360px)) * var(--viewer-image-aspect-ratio, 1)))',
      maxHeight: 'var(--viewer-image-max-height, calc(100vh - 360px))',
    },
  },
});

export const imageFull = style({
  gridArea: '1 / 1',
  zIndex: 2,
  opacity: 0,
  transition: 'opacity 180ms ease, transform 160ms ease',
});

export const imageFullLoaded = style({
  opacity: 1,
});

export const error = style({
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
  width: 'min(80vw, 600px)',
  maxWidth: '100%',
  minHeight: 220,
  padding: 24,
  border: '1px solid rgba(247, 234, 215, .3)',
  color: '#f0dfc5',
  textAlign: 'center',
});

export const metadata = style({
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: '4px 18px',
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '8px 0 0',
  color: '#f0dfc5',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 'clamp(12px, 1.2vw, 15px)',
  lineHeight: 1.35,
  letterSpacing: '.035em',
  '@media': {
    '(max-width: 640px)': {
      gap: '4px 10px',
      padding: '6px 0 0',
      fontSize: 11,
    },
  },
});

export const metadataTitle = style({
  flex: '1 1 12rem',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const metadataItem = style({
  flex: '0 1 auto',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const metadataDate = style({
  flex: '0 1 auto',
});

globalStyle(`${viewerFilm} ${image}`, { willChange: 'transform, opacity' });
globalStyle('html', { scrollbarGutter: 'stable' });
globalStyle('body:has([data-photo-viewer="open"])', { overflow: 'hidden' });
