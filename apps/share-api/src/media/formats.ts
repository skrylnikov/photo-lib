import sharp, { type SharpOptions } from 'sharp';
import exifr from 'exifr';

import { appConfig } from 'config';

import { exceedsHeifComplexityBudget, inspectHeifContainer } from './heif-container';

export const inputFormats = new Set(['jpeg', 'png', 'webp', 'avif', 'jxl', 'heif', 'heic']);
const decodedFormats = new Set([...inputFormats, 'heif']);
export const derivativeFormats = ['jxl', 'avif', 'heic', 'webp', 'jpeg'] as const;
export type DerivativeFormat = (typeof derivativeFormats)[number];
export const derivativeWidths = [640, 1280, 2560] as const;

export class MediaValidationError extends Error {
  constructor(public readonly safeCode: string) {
    super(safeCode);
  }
}

export type ValidatedOriginal = {
  format: string;
  width: number;
  height: number;
  orientation?: number;
};

export const boundedSharpInputOptions = (): SharpOptions => ({
  failOn: 'error',
  limitInputPixels: appConfig.media.maxPixels,
  unlimited: false,
});

const looksLikeHeif = (value: Uint8Array): boolean =>
  value.byteLength >= 12 && Buffer.from(value.buffer, value.byteOffset + 4, 4).toString('ascii') === 'ftyp';

const knownHeifComplexityFailure = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('security limit exceeded') &&
    (message.includes('item') || message.includes('reference') || message.includes('tile'))
  );
};

const forcePixelDecode = async (value: Uint8Array): Promise<void> => {
  await sharp(value, boundedSharpInputOptions())
    .resize({ width: 1, height: 1, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer();
};

export const readExifOrientation = async (
  value: Uint8Array,
  format: string,
): Promise<number | undefined> => {
  if (format === 'heif') return undefined;
  try {
    return await exifr.orientation(value);
  } catch {
    return undefined;
  }
};

export const parseExifDateTime = (value: unknown): Date | undefined => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:\s*(Z|[+-]\d{2}:?\d{2}))?$/.exec(value.trim());
  if (!match) return undefined;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisText, zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millis = Number((millisText || '').padEnd(3, '0') || 0);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return undefined;
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millis));
  if (naive.getUTCFullYear() !== year || naive.getUTCMonth() + 1 !== month || naive.getUTCDate() !== day || naive.getUTCHours() !== hour) return undefined;
  const base = zone
    ? `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}.${String(millis).padStart(3, '0')}${zone === 'Z' ? 'Z' : zone.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')}`
    : `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}.${String(millis).padStart(3, '0')}Z`;
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

export const readExifCaptureDate = async (value: Uint8Array): Promise<string | undefined> => {
  try {
    const exif = await exifr.parse(value, ['DateTimeOriginal']) as { DateTimeOriginal?: unknown } | undefined;
    const date = parseExifDateTime(exif?.DateTimeOriginal);
    return date?.toISOString();
  } catch {
    return undefined;
  }
};

export const validateOriginal = async (
  value: Uint8Array,
  decodePixels: (input: Uint8Array) => Promise<void> = forcePixelDecode,
): Promise<ValidatedOriginal> => {
  if (value.byteLength > appConfig.media.maxBytes) {
    throw new MediaValidationError('media_too_large');
  }

  const heif = looksLikeHeif(value);
  if (heif) {
    try {
      if (exceedsHeifComplexityBudget(inspectHeifContainer(value))) {
        throw new MediaValidationError('heif_complexity_limit_exceeded');
      }
    } catch (error) {
      if (error instanceof MediaValidationError) throw error;
      // A malformed container is left to Sharp/libheif so it receives the
      // same safe decode failure as other corrupt image data.
    }
  }

  try {
    const metadata = await sharp(value, boundedSharpInputOptions()).metadata();
    const format = typeof metadata.format === 'string' ? metadata.format.toLowerCase() : undefined;
    if (!format || !decodedFormats.has(format)) {
      throw new MediaValidationError('unsupported_image_format');
    }
    if (!metadata.width || !metadata.height) {
      throw new MediaValidationError('image_dimensions_missing');
    }
    if (metadata.width * metadata.height > appConfig.media.maxPixels) {
      throw new MediaValidationError('image_dimensions_too_large');
    }
    await decodePixels(value);
    const orientation = await readExifOrientation(value, format);
    const swapsDimensions = format !== 'heif' && [5, 6, 7, 8].includes(orientation ?? 1);
    return {
      format,
      width: swapsDimensions ? metadata.height : metadata.width,
      height: swapsDimensions ? metadata.width : metadata.height,
      ...(orientation === undefined ? {} : { orientation }),
    };
  } catch (error) {
    if (error instanceof MediaValidationError) throw error;
    if (heif && knownHeifComplexityFailure(error)) {
      throw new MediaValidationError('heif_complexity_limit_exceeded');
    }
    throw new MediaValidationError('image_decode_failed');
  }
};

const declaredOutputAvailable = (format: DerivativeFormat): boolean => {
  const runtimeFormat = format === 'avif' || format === 'heic' ? 'heif' : format;
  const formats = sharp.format as unknown as Partial<Record<string, { output?: unknown }>>;
  const output = formats[runtimeFormat]?.output;
  if (typeof output === 'boolean') return output;
  if (!output || typeof output !== 'object') return false;
  return Object.values(output).some((item) => item === true);
};

export const assertDerivativeRuntime = (): void => {
  for (const format of derivativeFormats) {
    if (!declaredOutputAvailable(format)) {
      throw new Error(`required_encoder_unavailable:${format}`);
    }
  }
};
