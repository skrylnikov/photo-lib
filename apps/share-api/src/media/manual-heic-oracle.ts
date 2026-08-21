import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';

import sharp from 'sharp';

import { appConfig } from 'config';

import { boundedSharpInputOptions, derivativeFormats, derivativeWidths, validateOriginal } from './formats';
import { encodeDerivative } from './processor';

const source = process.argv[2];
if (!source) throw new Error('usage: npm run oracle:heic -- <ignored-heic-path>');

await mkdir(appConfig.tmpPath, { recursive: true });
const original = await readFile(source);
const originalHash = createHash('sha256').update(original).digest('hex');
const validated = await validateOriginal(original);
const derivatives: Array<{ format: string; requestedWidth: number; width?: number; height?: number }> = [];

for (const requestedWidth of derivativeWidths) {
  for (const format of derivativeFormats) {
    const derivative = await encodeDerivative(original, format, requestedWidth, 'heif');
    const metadata = await sharp(derivative.value, boundedSharpInputOptions()).metadata();
    derivatives.push({ format, requestedWidth, width: metadata.width, height: metadata.height });
  }
}

const originalUnchanged = createHash('sha256').update(original).digest('hex') === originalHash;
process.stdout.write(
  `${JSON.stringify(
    {
      validation: validated,
      originalUnchanged,
      derivativeCount: derivatives.length,
      derivatives,
    },
    null,
    2,
  )}\n`,
);
