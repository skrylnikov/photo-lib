import { style } from '@vanilla-extract/css';

export const workspace = style({
  maxWidth: 1440,
  margin: '0 auto',
});

export const header = style({
  alignItems: 'flex-start',
  '@media': {
    '(max-width: 700px)': { flexDirection: 'column' },
  },
});

export const layout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)',
  alignItems: 'start',
  gap: 24,
  '@media': {
    '(max-width: 900px)': { gridTemplateColumns: '1fr' },
  },
});

export const sidebar = style({
  position: 'sticky',
  top: 16,
  '@media': {
    '(max-width: 900px)': { position: 'static' },
  },
});

export const albumButton = style({
  flex: 1,
  width: '100%',
  justifyContent: 'flex-start',
  textAlign: 'left',
});

export const dropzone = style({
  border: '2px dashed var(--mantine-color-blue-4)',
  borderRadius: 12,
  padding: 28,
  textAlign: 'center',
  background: 'var(--mantine-color-blue-0)',
  transition: 'background 120ms ease, border-color 120ms ease',
  selectors: {
    '&:hover': { background: 'var(--mantine-color-blue-1)' },
  },
});

export const queueGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
  gap: 12,
});

export const queueCard = style({
  overflow: 'hidden',
});

export const preview = style({
  display: 'block',
  width: '100%',
  height: 140,
  objectFit: 'cover',
  background: 'var(--mantine-color-gray-1)',
});

export const compositionGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16,
});

export const availableMediaGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16,
});

export const availableMediaCard = style({
  overflow: 'hidden',
});

export const dragTarget = style({
  outline: '2px solid var(--mantine-color-blue-5)',
  outlineOffset: 2,
  background: 'var(--mantine-color-blue-0)',
});

export const mediaPreview = style({
  width: '100%',
  height: 160,
  objectFit: 'cover',
  background: 'var(--mantine-color-gray-1)',
});

export const previewButton = style({
  display: 'block',
  width: '100%',
  padding: 0,
  border: 0,
  cursor: 'pointer',
  background: 'transparent',
});

export const libraryPreview = style({
  display: 'block',
  width: '100%',
  maxHeight: '75vh',
  objectFit: 'contain',
});

export const previewFallback = style({
  display: 'grid',
  placeItems: 'center',
  width: '100%',
  height: 160,
  padding: 16,
  color: 'var(--mantine-color-dimmed)',
  background: 'var(--mantine-color-gray-1)',
  textAlign: 'center',
});

export const visuallyHidden = style({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});
