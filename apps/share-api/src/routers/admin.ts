import { randomUUID } from 'node:crypto';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from 'database';
import { appConfig } from 'config';

import { adminProcedure, router } from '../trpc';
import { cleanupMediaDeletion } from '../storage/maintenance';
import { objectStore, type ObjectStore } from '../storage/object-store';

const albumInput = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
});

const albumIdInput = z.object({ id: z.string().min(1) });
const albumOrderInput = z.object({ albumIds: z.array(z.string().min(1)) });

const albumMediaItems = z.array(z.object({
    mediaId: z.string().min(1),
    featured: z.boolean(),
    // Compatibility with the previous client; position is now derived from order.
    position: z.number().int().min(0).optional(),
  })).superRefine((items, context) => {
  const mediaIds = items.map((item) => item.mediaId);
  if (new Set(mediaIds).size !== mediaIds.length) {
    context.addIssue({ code: 'custom', message: 'duplicate_media' });
  }
});

const mediaIdList = z.object({ albumId: z.string().min(1), items: albumMediaItems });
const saveAlbumInput = albumInput.extend({ id: z.string().min(1), items: albumMediaItems });

export type OrderedAlbumMediaInput = { mediaId: string; featured: boolean; position?: number };

export const normalizeAlbumMediaItems = (items: ReadonlyArray<OrderedAlbumMediaInput>) =>
  items.map((item, position) => ({ mediaId: item.mediaId, featured: item.featured, position }));

export const normalizeAlbumOrder = (albumIds: readonly string[], existingAlbumIds: readonly string[]) => {
  if (new Set(albumIds).size !== albumIds.length) throw new Error('duplicate_album_ids');
  const existing = new Set(existingAlbumIds);
  if (albumIds.some((id) => !existing.has(id))) throw new Error('unknown_album_ids');
  const ordered = new Set(albumIds);
  if (existingAlbumIds.some((id) => !ordered.has(id))) throw new Error('missing_album_ids');
  return albumIds.map((id, position) => ({ id, position }));
};

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

type AdminDependencies = {
  objectStore: ObjectStore;
  cleanupMediaDeletion: typeof cleanupMediaDeletion;
};

const defaultAdminDependencies: AdminDependencies = { objectStore, cleanupMediaDeletion };

export const createAdminRouter = (dependencies: AdminDependencies = defaultAdminDependencies) => router({
  listAlbums: adminProcedure.query(async () => {
    const albums = await prisma.album.findMany({
      orderBy: { position: 'asc' },
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

  createAlbum: adminProcedure.input(albumInput).mutation(({ input }) => prisma.$transaction(async (transaction) => {
    const last = await transaction.album.aggregate({ _max: { position: true } });
    return transaction.album.create({
      data: { ...input, description: input.description ?? null, position: (last._max.position ?? -1) + 1 },
    });
  })),

  reorderAlbums: adminProcedure.input(albumOrderInput).mutation(({ input }) => prisma.$transaction(async (transaction) => {
    const existing = await transaction.album.findMany({ select: { id: true } });
    const order = (() => {
      try {
        return normalizeAlbumOrder(input.albumIds, existing.map(({ id }) => id));
      } catch (error) {
        return operationError(error instanceof Error ? error.message : 'invalid_album_order');
      }
    })();
    if (order.length > 0) {
      await transaction.album.updateMany({ data: { position: { increment: order.length } } });
      for (const album of order) {
        await transaction.album.update({ where: { id: album.id }, data: { position: album.position } });
      }
    }
    return { ok: true };
  })),

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

  saveAlbum: adminProcedure.input(saveAlbumInput).mutation(({ input }) => prisma.$transaction(async (transaction) => {
    const album = await transaction.album.findUnique({ where: { id: input.id }, select: { published: true } });
    if (!album) throw new TRPCError({ code: 'NOT_FOUND', message: 'album_not_found' });
    if (album.published) operationError('album_must_be_unpublished');
    const ids = input.items.map((item) => item.mediaId);
    const media = await transaction.mediaAsset.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, derivatives: { select: { format: true } } },
    });
    if (media.length !== ids.length) operationError('media_not_found');
    const notReady = media.filter((item) => item.status !== 'ready' ||
      !browserSafeFormats.every((format) => item.derivatives.some((derivative) => derivative.format === format)));
    if (notReady.length > 0) operationError(`media_not_ready:${notReady.map((item) => item.id).join(',')}`);

    const { id, items, ...data } = input;
    await transaction.album.update({
      where: { id },
      data: { ...data, description: data.description ?? null },
    });
    await transaction.albumMedia.deleteMany({ where: { albumId: id } });
    if (items.length > 0) {
      await transaction.albumMedia.createMany({
        data: normalizeAlbumMediaItems(items).map((item) => ({ albumId: id, ...item })),
      });
    }
    return { ok: true };
  })),

  deleteMedia: adminProcedure.input(albumIdInput).mutation(async ({ input }) => {
    const media = await prisma.mediaAsset.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        originalKey: true,
        status: true,
        albumLinks: { select: { album: { select: { title: true, published: true } } } },
      },
    });
    if (!media) throw new TRPCError({ code: 'NOT_FOUND', message: 'media_not_found' });
    if (media.status === 'pending' || media.status === 'processing') operationError('media_processing');
    const blockers = media.albumLinks.filter(({ album }) => album.published).map(({ album }) => album.title);
    if (blockers.length > 0) operationError(`media_in_published_albums:${blockers.join(',')}`);

    const deletion = { mediaId: media.id, originalKey: media.originalKey, attempts: 0 };
    await prisma.$transaction(async (transaction) => {
      await transaction.mediaDeletion.create({ data: deletion });
      await transaction.uploadIntent.deleteMany({ where: { mediaId: media.id } });
      await transaction.mediaAsset.delete({ where: { id: media.id } });
    });
    await dependencies.cleanupMediaDeletion(deletion).catch(() => undefined);
    return { ok: true };
  }),

  retryMedia: adminProcedure.input(albumIdInput).mutation(async ({ input }) => {
    const media = await prisma.mediaAsset.findUnique({
      where: { id: input.id },
      select: { id: true, originalKey: true, status: true },
    });
    if (!media) throw new TRPCError({ code: 'NOT_FOUND', message: 'media_not_found' });
    if (media.status !== 'failed') operationError('media_not_failed');
    if (!await dependencies.objectStore.exists(media.originalKey)) operationError('media_original_unavailable');

    const now = new Date();
    await prisma.$transaction(async (transaction) => {
      const job = await transaction.mediaJob.updateMany({
        where: { mediaId: media.id, kind: 'process-media' },
        data: {
          status: 'pending',
          attempts: 0,
          availableAt: now,
          leaseExpiresAt: null,
          startedAt: null,
          completedAt: null,
          safeError: null,
        },
      });
      if (job.count !== 1) operationError('media_job_not_found');
      const asset = await transaction.mediaAsset.updateMany({
        where: { id: media.id, status: 'failed' },
        data: { status: 'pending', safeError: null },
      });
      if (asset.count !== 1) operationError('media_not_failed');
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
      uploadUrl: await dependencies.objectStore.presignPut(objectKey, input.mime),
      assignment: assignmentDto(intent),
    };
  }),

  completeUpload: adminProcedure.input(z.object({ intentId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const intent = await prisma.uploadIntent.findUnique({ where: { id: input.intentId } });
    if (!intent || intent.status !== 'pending' || intent.expiresAt <= new Date()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'upload_intent_invalid' });
    }
    const exists = await dependencies.objectStore.exists(intent.objectKey);
    const bytes = await dependencies.objectStore.size(intent.objectKey);
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

export const adminRouter = createAdminRouter();
