import { globalStyle, style } from '@vanilla-extract/css';

globalStyle('body', { margin: 0, background: '#f7f8fa', color: '#1f2937', fontFamily: 'system-ui, sans-serif' });
globalStyle('button, input', { font: 'inherit' });

export const appShell = style({ minHeight: '100vh' });
export const page = style({ padding: 'clamp(16px, 4vw, 48px)' });
export const photo = style({ display: 'block', width: '100%', objectFit: 'contain', background: '#e5e7eb' });
