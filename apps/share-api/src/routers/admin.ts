import { randomUUID } from 'node:crypto';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from 'database';
import { appConfig } from 'config';

import { adminProcedure, router } from '../trpc';
import { objectStore } from '../storage/object-store';

const albumInput = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
});

const albumIdInput = z.object({ id: z.string().min(1) });

const mediaIdList = z.object({
  albumId: z.string().min(1),
  items: z.array(z.object({
    mediaId: z.string().min(1),
    featured: z.boolean(),
    // Compatibility with the previous client; position is now derived from order.
    position: z.number().int().min(0).optional(),
  })),
}).superRefine((value, context) => {
  const mediaIds = value.items.map((item) => item.mediaId);
  if (new Set(mediaIds).size !== mediaIds.length) {
    context.addIssue({ code: 'custom', path: ['items'], message: 'duplicate_media' });
  }
});

export type OrderedAlbumMediaInput = { mediaId: string; featured: boolean; position?: number };

export const normalizeAlbumMediaItems = (items: ReadonlyArray<OrderedAlbumMediaInput>) =>
  items.map((item, position) => ({ mediaId: item.mediaId, featured: item.featured, position }));

const targetAlbumInput = z.object({ targetAlbumId: z.string().min(1).nullable().optional() });
const browserSafeFormats = ['jxl', 'avif', 'heic', 'webp', 'jpeg'] as const;

const blockersFor = (album: { media: Array<{ media: { id: string; originalName?: string; status: string; derivatives: Array<{ format: string }> } }> }) =>
  album.media
    .filter(({ media }) =>
      media.status !== 'ready' ||
      !browserSafeFormats.every((format) => media.derivatives.some((derivative) => derivative.format === format)),
    )
    .map(({ media }) => ({ mediaId: media.id, originalName: media.originalName, status: media.status }));

const assignmentDto = (intent: {
  targetAlbumId: string | null;
  assignmentStatus: string;
  assignmentError: string | null;
} | null) => intent ? {
  targetAlbumId: intent.targetAlbumId,
  assignmentStatus: intent.assignmentStatus,
  assignmentError: intent.assignmentError,
} : {
  targetAlbumId: null,
  assignmentStatus: 'not_requested' as const,
  assignmentError: null,
};

const operationError = (cause: string): never => {
  throw new TRPCError({ code: 'BAD_REQUEST', message: cause });
};

export const adminRouter = router({
  listAlbums: adminProcedure.query(async () => {
    const albums = await prisma.album.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        media: {
          orderBy: { position: 'asc' },
          include: {
            media: {
              select: {
                id: true,
                originalName: true,
                status: true,
                safeError: true,
                width: true,
                height: true,
                derivatives: { select: { format: true, width: true, height: true } },
                uploadIntent: { select: { targetAlbumId: true, assignmentStatus: true, assignmentError: true } },
              },
            },
          },
        },
      },
    });
    return albums.map((album) => ({
      ...album,
      media: album.media.map((membership) => ({
        ...membership,
        media: { ...membership.media, assignment: assignmentDto(membership.media.uploadIntent) },
      })),
    }));
  }),

  listMedia: adminProcedure.query(async () => {
    const media = await prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        originalMime: true,
        originalBytes: true,
        width: true,
        height: true,
        status: true,
        safeError: true,
        createdAt: true,
        derivatives: { select: { format: true, width: true, height: true } },
        uploadIntent: { select: { targetAlbumId: true, assignmentStatus: true, assignmentError: true } },
        albumLinks: { select: { albumId: true, position: true, featured: true, album: { select: { title: true, published: true } } } },
      },
    });
    return media.map((item) => ({ ...item, assignment: assignmentDto(item.uploadIntent) }));
  }),

  createAlbum: adminProcedure.input(albumInput).mutation(({ input }) =>
    prisma.album.create({ data: { ...input, description: input.description ?? null } }),
  ),

  updateAlbum: adminProcedure.input(albumInput.extend({ id: z.string().min(1) })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    const album = await prisma.album.findUnique({ where: { id }, select: { id: true, published: true } });
    if (!album) throw new TRPCError({ code: 'NOT_FOUND', message: 'album_not_found' });
    if (album.published) operationError('album_must_be_unpublished');
    return prisma.album.update({ data: { ...data, description: data.description ?? null }, where: { id } });
  }),

  deleteAlbum: adminProcedure.input(albumIdInput).mutation(async ({ input }) => {
    const album = await prisma.album.findUnique({ where: { id: input.id } });
    if (!album) throw new TRPCError({ code: 'NOT_FOUND', message: 'album_not_found' });
    if (album.published) operationError('album_must_be_unpublished');
    await prisma.album.delete({ where: { id: input.id } });
    return { ok: true };
  }),

  setAlbumMedia: adminProcedure.input(mediaIdList).mutation(async ({ input }) => {
    const album = await prisma.album.findUnique({ where: { id: input.albumId }, select: { id: true, published: true } });
    if (!album) throw new TRPCError({ code: 'NOT_FOUND', message: 'album_not_found' });
    if (album.published) operationError('album_must_be_unpublished');
    const ids = input.items.map((item) => item.mediaId);
    const media = await prisma.mediaAsset.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, derivatives: { select: { format: true } } },
    });
    if (media.length !== new Set(ids).size) operationError('media_not_found');
    const notReady = media.filter((item) => item.status !== 'ready' || !browserSafeFormats.every((format) => item.derivatives.some((derivative) => derivative.format === format)));
    if (notReady.length > 0) operationError(`media_not_ready:${notReady.map((item) => item.id).join(',')}`);
    await prisma.$transaction(async (transaction) => {
      await transaction.albumMedia.deleteMany({ where: { albumId: input.albumId } });
      if (input.items.length > 0) {
        await transaction.albumMedia.createMany({
          data: normalizeAlbumMediaItems(input.items).map((item) => ({ albumId: input.albumId, ...item })),
        });
      }
    });
    return { ok: true };
  }),

  publishAlbum: adminProcedure.input(albumIdInput).mutation(async ({ input }) => {
    const album = await prisma.album.findUnique({
      where: { id: input.id },
      include: { media: { include: { media: { include: { derivatives: true } } } } },
    });
    if (!album) throw new TRPCError({ code: 'NOT_FOUND', message: 'album_not_found' });
    const blockers = blockersFor(album);
    if (album.media.length === 0 || blockers.length > 0) {
      operationError(`album_not_ready:${blockers.map((item) => item.originalName || item.mediaId).join(',') || 'empty'}`);
    }
    return prisma.album.update({ where: { id: input.id }, data: { published: true, publishedAt: new Date() } });
  }),

  unpublishAlbum: adminProcedure.input(albumIdInput).mutation(async ({ input }) => {
    const album = await prisma.album.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!album) throw new TRPCError({ code: 'NOT_FOUND', message: 'album_not_found' });
    return prisma.album.update({ where: { id: input.id }, data: { published: false, publishedAt: null } });
  }),

  createUploadIntent: adminProcedure.input(z.object({
    originalName: z.string().trim().min(1).max(255),
    mime: z.string().trim().min(1).max(120),
    bytes: z.number().int().positive().max(appConfig.media.maxBytes),
  }).extend(targetAlbumInput.shape)).mutation(async ({ ctx, input }) => {
    const targetAlbumId = input.targetAlbumId ?? null;
    if (targetAlbumId) {
      const album = await prisma.album.findUnique({ where: { id: targetAlbumId }, select: { published: true } });
      if (!album) throw new TRPCError({ code: 'NOT_FOUND', message: 'target_album_not_found' });
      if (album.published) operationError('album_must_be_unpublished');
    }
    const objectKey = `originals/${randomUUID()}`;
    const expiresAt = new Date(Date.now() + appConfig.rustfs.presignSeconds * 1000);
    const intent = await prisma.uploadIntent.create({
      data: {
        objectKey,
        originalName: input.originalName,
        expectedMime: input.mime,
        expectedBytes: input.bytes,
        targetAlbumId,
        assignmentStatus: targetAlbumId ? 'pending' : 'not_requested',
        expiresAt,
        createdBy: ctx.session.subject,
      },
    });
    return {
      id: intent.id,
      expiresAt,
      uploadUrl: await objectStore.presignPut(objectKey, input.mime),
      assignment: assignmentDto(intent),
    };
  }),

  completeUpload: adminProcedure.input(z.object({ intentId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const intent = await prisma.uploadIntent.findUnique({ where: { id: input.intentId } });
    if (!intent || intent.status !== 'pending' || intent.expiresAt <= new Date()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'upload_intent_invalid' });
    }
    const exists = await objectStore.exists(intent.objectKey);
    const bytes = await objectStore.size(intent.objectKey);
    if (!exists || bytes === null || bytes !== intent.expectedBytes) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'upload_verification_failed' });
    }
    const verifiedBytes = bytes;
    const media = await prisma.$transaction(async (transaction) => {
      const created = await transaction.mediaAsset.create({
        data: {
          originalKey: intent.objectKey,
          originalName: intent.originalName,
          originalMime: intent.expectedMime,
          originalBytes: verifiedBytes,
          width: 0,
          height: 0,
          status: 'pending',
          createdBy: ctx.session.subject,
        },
      });
      await transaction.uploadIntent.update({
        where: { id: intent.id },
        data: { mediaId: created.id, status: 'completed', completedAt: new Date() },
      });
      await transaction.mediaJob.create({
        data: { mediaId: created.id, kind: 'process-media', maxAttempts: appConfig.media.maxAttempts },
      });
      return created;
    });
    return { id: media.id, status: media.status, assignment: assignmentDto(intent) };
  }),
});
