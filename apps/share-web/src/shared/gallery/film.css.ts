import { createVar, style } from '@vanilla-extract/css';
import paperTexture from './paper-texture.svg';

const paperGrain = `url("${paperTexture}")`;

export const filmRadius = createVar();
export const filmPaddingTop = createVar();
export const filmPaddingBottom = createVar();
export const filmPaddingInline = createVar();
export const filmPerforationHeight = createVar();
export const filmPerforationHoleWidth = createVar();
export const filmPerforationStep = createVar();
export const filmPerforationColor = createVar();
export const filmPerforationInset = createVar();
export const filmPerforationOffset = createVar();

const filmPerforation = `repeating-linear-gradient(90deg, ${filmPerforationColor} 0 ${filmPerforationHoleWidth}, transparent ${filmPerforationHoleWidth} ${filmPerforationStep})`;

export const gallery = style({
  width: '100%',
  minWidth: 0,
});

export const backdrop = style({
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: 'clamp(18px, 3vw, 32px)',
  border: '1px solid rgba(112, 91, 70, .18)',
  borderRadius: 18,
  backgroundColor: '#e8e0d2',
  backgroundImage: [
    paperGrain,
    'radial-gradient(ellipse at 12% 18%, rgba(255, 255, 255, .34), transparent 42%)',
    'linear-gradient(135deg, rgba(255, 255, 255, .2), transparent 48%, rgba(83, 67, 51, .06))',
  ].join(', '),
  backgroundSize: '180px 180px, 100% 100%, 100% 100%',
  backgroundBlendMode: 'multiply, normal, normal',
  boxShadow: '0 14px 36px rgba(81, 63, 45, .1)',
  '@media': {
    '(max-width: 640px)': {
      padding: '16px 10px 18px',
      borderRadius: 12,
      backgroundImage: [
        paperGrain,
        'linear-gradient(135deg, rgba(255, 255, 255, .18), rgba(83, 67, 51, .04))',
      ].join(', '),
      backgroundSize: '180px 180px, 100% 100%',
      backgroundBlendMode: 'multiply, normal',
      boxShadow: '0 8px 18px rgba(81, 63, 45, .08)',
    },
  },
});

export const header = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 'clamp(14px, 2vw, 22px)',
});

export const title = style({
  margin: 0,
  color: '#4e4034',
  fontFamily: 'Film Hand, Bradley Hand, Chalkboard, "Segoe Print", cursive',
  fontSize: 'clamp(24px, 3vw, 40px)',
  fontWeight: 500,
  lineHeight: 1.05,
  letterSpacing: '.02em',
});

export const count = style({
  margin: '5px 0 0',
  color: '#786858',
  fontSize: 13,
  letterSpacing: '.04em',
});

export const action = style({
  flex: '0 0 auto',
  paddingTop: 4,
});

export const filmBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  width: '100%',
  minWidth: 0,
  overflow: 'hidden',
});

export const filmSurface = style({
  position: 'relative',
  boxSizing: 'border-box',
  overflow: 'hidden',
  padding: `${filmPaddingTop} ${filmPaddingInline} ${filmPaddingBottom}`,
  border: '1px solid rgba(255, 255, 255, .09)',
  borderRadius: filmRadius,
  background: 'linear-gradient(180deg, rgba(27, 28, 31, .46) 0%, rgba(12, 13, 15, .54) 48%, rgba(22, 23, 26, .46) 100%)',
  vars: {
    [filmRadius]: '0px',
    [filmPaddingTop]: '24px',
    [filmPaddingBottom]: '24px',
    [filmPaddingInline]: '14px',
    [filmPerforationHeight]: '10px',
    [filmPerforationHoleWidth]: '10px',
    [filmPerforationStep]: '18px',
    [filmPerforationColor]: '#e8e0d2',
    [filmPerforationInset]: '3px',
    [filmPerforationOffset]: '0px',
  },
  selectors: {
    '&::before': {
      content: '""',
      position: 'absolute',
      zIndex: 3,
      top: filmPerforationInset,
      right: 0,
      left: 0,
      height: filmPerforationHeight,
      pointerEvents: 'none',
      backgroundImage: filmPerforation,
      backgroundPosition: `${filmPerforationOffset} center`,
      backgroundRepeat: 'repeat-x',
      backgroundSize: `${filmPerforationStep} 100%`,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      zIndex: 3,
      right: 0,
      bottom: filmPerforationInset,
      left: 0,
      height: filmPerforationHeight,
      pointerEvents: 'none',
      backgroundImage: filmPerforation,
      backgroundPosition: `${filmPerforationOffset} center`,
      backgroundRepeat: 'repeat-x',
      backgroundSize: `${filmPerforationStep} 100%`,
    },
  },
  '@media': {
    '(max-width: 640px)': {
      vars: {
        [filmRadius]: '0px',
        [filmPaddingTop]: '20px',
        [filmPaddingBottom]: '20px',
        [filmPaddingInline]: '8px',
        [filmPerforationHeight]: '9px',
        [filmPerforationHoleWidth]: '9px',
        [filmPerforationStep]: '16px',
        [filmPerforationInset]: '3px',
        [filmPerforationOffset]: '0px',
      },
    },
  },
});

export const row = style({
  display: 'flex',
  alignItems: 'stretch',
  gap: 8,
  width: 'max-content',
  maxWidth: '100%',
  minWidth: 0,
  '@media': { '(max-width: 640px)': { gap: 6 } },
});

export const frame = style({
  position: 'relative',
  zIndex: 2,
  flex: '0 0 auto',
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  border: 0,
  borderRadius: 3,
  color: '#f2f0e9',
  background: 'transparent',
  cursor: 'zoom-in',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      zIndex: 1,
      inset: 0,
      borderRadius: 3,
      pointerEvents: 'none',
      opacity: 0,
      background: 'linear-gradient(118deg, rgba(255, 190, 126, .16), rgba(255, 224, 173, .04) 48%, rgba(255, 255, 255, .1))',
      boxShadow: 'inset 0 0 0 1px rgba(255, 238, 198, .58), inset 0 0 18px rgba(255, 168, 98, .16)',
      transition: 'opacity 900ms ease',
    },
    '&:hover::after': { opacity: 1 },
    '&:focus-visible::after': { opacity: 1 },
    '&:focus-visible': { outline: '3px solid #ef765c', outlineOffset: 3 },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&::after': { transition: 'none' },
      },
    },
  },
});

export const image = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  borderRadius: 3,
  background: '#0a0b0c',
});
