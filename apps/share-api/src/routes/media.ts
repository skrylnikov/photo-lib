import type { FastifyInstance } from 'fastify';

import { prisma } from 'database';
import { readSession } from '../auth/session';
import { appConfig } from 'config';
import { cacheGet, cachePut } from '../storage/cache';
import { objectStore } from '../storage/object-store';
import { isPubliclyVisibleMedia } from './publication';

const contentTypes: Record<string, string> = {
  jxl: 'image/jxl',
  avif: 'image/avif',
  heic: 'image/heic',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
};
const formats = ['jxl', 'avif', 'heic', 'webp', 'jpeg'] as const;

const mediaDependencies = { prisma, readSession, cacheGet, cachePut, objectStore };

export const registerMediaRoutes = (
  app: FastifyInstance,
  overrides: Partial<typeof mediaDependencies> = {},
): void => {
  const dependencies = { ...mediaDependencies, ...overrides };
  app.get('/media/:mediaId/:format/:width', async (request, reply) => {
    const params = request.params as { mediaId?: string; format?: string; width?: string };
    const mediaId = params.mediaId ?? '';
    const format = params.format ?? '';
    const width = Number.parseInt(params.width ?? '', 10);
    if (!formats.includes(format as (typeof formats)[number]) || !Number.isSafeInteger(width) || width <= 0) {
      return reply.code(404).send({ error: 'not_found' });
    }
    const derivativeFormat = format as (typeof formats)[number];

    const session = await dependencies.readSession(request.cookies[appConfig.oidc.cookieName]);
    const media = await dependencies.prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: { derivatives: { where: { format: derivativeFormat, width }, take: 1 } },
    });
    if (!media || media.derivatives.length === 0) {
      return reply.code(404).send({ error: 'not_found' });
    }
    if (!session) {
      const publication = await dependencies.prisma.albumMedia.findFirst({
        where: { mediaId, album: { published: true } },
        select: { mediaId: true },
      });
      if (!isPubliclyVisibleMedia(media.status, Boolean(publication))) return reply.code(404).send({ error: 'not_found' });
    } else if (!isPubliclyVisibleMedia(media.status, true)) {
      return reply.code(404).send({ error: 'not_found' });
    }

    const derivative = media.derivatives[0];
    const cached = await dependencies.cacheGet(derivative.objectKey);
    if (cached) {
      return reply
        .header('Content-Type', contentTypes[format])
        .header('Cache-Control', 'private, max-age=60')
        .send(cached);
    }

    const stored = await dependencies.objectStore.response(derivative.objectKey);
    if (!stored?.body) return reply.code(404).send({ error: 'not_found' });
    const value = Buffer.from(await stored.arrayBuffer());
    await dependencies.cachePut(derivative.objectKey, value);
    return reply
      .header('Content-Type', contentTypes[format])
      .header('Cache-Control', 'private, max-age=60')
      .send(value);
  });
};
