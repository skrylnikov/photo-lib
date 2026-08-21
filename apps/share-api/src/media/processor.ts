import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import sharp, { type Sharp } from 'sharp';
import { prisma } from 'database';
import { appConfig } from 'config';

import { objectStore } from '../storage/object-store';
import {
  assertDerivativeRuntime,
  boundedSharpInputOptions,
  readExifOrientation,
  readExifCaptureDate,
  validateOriginal,
  derivativeFormats,
  derivativeWidths,
  type ValidatedOriginal,
  type DerivativeFormat,
} from './formats';
import { resolveAssignment } from './assignment-state';

sharp.concurrency(1);
sharp.cache({ memory: 64, files: 0, items: 100 });

const contentTypeFor = (format: DerivativeFormat): string =>
  format === 'jpeg' ? 'image/jpeg' : `image/${format}`;

export interface EncodedDerivative {
  format: DerivativeFormat;
  width: (typeof derivativeWidths)[number];
  height: number;
  value: Buffer;
}

export interface PersistedDerivative {
  format: DerivativeFormat;
  width: (typeof derivativeWidths)[number];
  height: number;
  bytes: number;
}

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

export const encodeDerivative = async (
  input: Uint8Array,
  format: DerivativeFormat,
  width: number,
  inputFormat: ValidatedOriginal['format'],
  inputOrientation?: number,
): Promise<{ value: Buffer; height: number }> => {
  // libheif/libvips applies HEIF container transforms while loading. Apply
  // EXIF orientation for other formats, but never auto-orient HEIF again or
  // tiled HEIF rotation would be doubled.
  const source = sharp(input, boundedSharpInputOptions());
  const oriented = inputFormat === 'heif' || !inputOrientation || inputOrientation === 1
    ? source
    : inputOrientation === 2
      ? source.flop()
      : inputOrientation === 3
        ? source.rotate(180)
        : inputOrientation === 4
          ? source.flip()
          : inputOrientation === 5
            ? source.flop().rotate(270)
            : inputOrientation === 6
              ? source.rotate(90)
              : inputOrientation === 7
                ? source.flop().rotate(90)
                : inputOrientation === 8
                  ? source.rotate(270)
                  : source;
  const pipeline = oriented.resize({
    width,
    withoutEnlargement: true,
    fit: 'inside',
  });
  const output =
    format === 'jpeg'
      ? pipeline.jpeg({ quality: 86, progressive: true })
      : format === 'webp'
        ? pipeline.webp({ quality: 84 })
        : format === 'avif'
          ? pipeline.avif({ quality: 50, effort: 4, tune: 'psnr' })
          : format === 'heic'
            ? pipeline.heif({ compression: 'hevc', quality: 50, effort: 4, chromaSubsampling: '4:2:0' })
            : (pipeline as unknown as { jxl: (options: { quality: number }) => Sharp }).jxl({ quality: 85 });
  if (format === 'avif' || format === 'heic') {
    const target = join(appConfig.tmpPath, `derivative-${randomUUID()}.${format}`);
    try {
      await output.toFile(target);
      const value = await readFile(target);
      const outputMetadata = await sharp(value).metadata();
      return { value, height: outputMetadata.height };
    } finally {
      await rm(target, { force: true });
    }
  }
  const value = await output.toBuffer();
  const outputMetadata = await sharp(value).metadata();
  return { value, height: outputMetadata.height };
};

export const processOriginalBytes = async (
  original: Uint8Array,
  persistDerivative: (derivative: EncodedDerivative) => Promise<void>,
  markReady: (validated: ValidatedOriginal, derivatives: PersistedDerivative[], capturedAt?: string) => Promise<void>,
  validate: (value: Uint8Array) => Promise<ValidatedOriginal> = validateOriginal,
): Promise<void> => {
  const validated = await validate(original);
  const capturedAt = await readExifCaptureDate(original);
  const orientation = validated.orientation ?? await readExifOrientation(original, validated.format);
  const derivatives: PersistedDerivative[] = [];
  for (const width of derivativeWidths) {
    for (const format of derivativeFormats) {
      const encoded = await encodeDerivative(original, format, width, validated.format, orientation);
      await persistDerivative({ format, width, height: encoded.height, value: encoded.value });
      derivatives.push({ format, width, height: encoded.height, bytes: encoded.value.byteLength });
    }
  }
  await markReady(validated, derivatives, capturedAt);
};

export const processMedia = async (mediaId: string): Promise<void> => {
  assertDerivativeRuntime();
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media) throw new Error('media_not_found');

  const response = await objectStore.response(media.originalKey);
  if (!response?.body) throw new Error('original_unavailable');
  await mkdir(appConfig.tmpPath, { recursive: true });
  const temporary = join(appConfig.tmpPath, `${mediaId}-${randomUUID()}.original`);
  try {
    const reader = response.body.getReader();
    type ChunkRead = { done: boolean; value?: Uint8Array };
    const readChunk = async (): Promise<ChunkRead> => reader.read() as Promise<ChunkRead>;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    let next = await readChunk();
    while (!next.done) {
      if (!next.value) break;
      const chunk = next.value;
      bytes += chunk.byteLength;
      if (bytes > appConfig.media.maxBytes) throw new Error('media_too_large');
      chunks.push(chunk);
      next = await readChunk();
    }
    const original = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    await writeFile(temporary, original);
    const version = randomUUID();
    await processOriginalBytes(
      await readFile(temporary),
      async (derivative) => {
        const objectKey = `derivatives/${mediaId}/${String(derivative.width)}.${derivative.format}`;
        await objectStore.put(
          objectKey,
          derivative.value,
          contentTypeFor(derivative.format),
          derivative.value.byteLength,
        );
      },
      async (validated, derivatives, capturedAt) => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await prisma.$transaction(async (transaction) => {
              await transaction.mediaAsset.update({
                where: { id: mediaId },
                data: {
                  width: validated.width,
                  height: validated.height,
                  capturedAt: capturedAt ? new Date(capturedAt) : media.createdAt,
                  status: 'ready',
                  safeError: null,
                },
              });
              await transaction.derivative.deleteMany({ where: { mediaId } });
              await transaction.derivative.createMany({
                data: derivatives.map((derivative) => ({
                  ...derivative,
                  mediaId,
                  version,
                  objectKey: `derivatives/${mediaId}/${String(derivative.width)}.${derivative.format}`,
                })),
              });

              const intent = await transaction.uploadIntent.findUnique({
                where: { mediaId },
                select: { id: true, targetAlbumId: true },
              });
              if (!intent?.targetAlbumId) return;

              const existingMembership = await transaction.albumMedia.findUnique({
                where: { albumId_mediaId: { albumId: intent.targetAlbumId, mediaId } },
              });
              if (existingMembership) {
                await transaction.uploadIntent.update({
                  where: { id: intent.id },
                  data: { assignmentStatus: 'added', assignmentError: null },
                });
                return;
              }

              const targetAlbum = await transaction.album.findUnique({
                where: { id: intent.targetAlbumId },
                select: { id: true, published: true },
              });
              const assignment = resolveAssignment(intent.targetAlbumId, {
                exists: Boolean(targetAlbum),
                published: targetAlbum?.published ?? false,
                alreadyLinked: Boolean(existingMembership),
              });
              if (assignment.status === 'unavailable') {
                await transaction.uploadIntent.update({
                  where: { id: intent.id },
                  data: { assignmentStatus: assignment.status, assignmentError: assignment.error },
                });
                return;
              }
              const writableTargetAlbumId = targetAlbum?.id ?? intent.targetAlbumId;
              const lastMembership = await transaction.albumMedia.findFirst({
                where: { albumId: writableTargetAlbumId },
                orderBy: { position: 'desc' },
                select: { position: true },
              });
              await transaction.albumMedia.create({
                data: {
                  albumId: writableTargetAlbumId,
                  mediaId,
                  position: (lastMembership?.position ?? -1) + 1,
                  featured: false,
                },
              });
              await transaction.uploadIntent.update({
                where: { id: intent.id },
                data: { assignmentStatus: 'added', assignmentError: null },
              });
            });
            return;
          } catch (error) {
            if (!isUniqueConstraintError(error) || attempt === 2) throw error;
          }
        }
      },
    );
  } finally {
    await rm(temporary, { force: true });
  }
};
