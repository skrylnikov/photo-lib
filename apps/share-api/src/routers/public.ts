import { router, publicProcedure } from '../trpc';

import { prisma } from 'database';
import { z } from 'zod';

type PublicDerivativeFormat = 'jxl' | 'avif' | 'heic' | 'webp' | 'jpeg';

const derivativeUrl = (mediaId: string, format: string, width: number): string =>
  `/media/${encodeURIComponent(mediaId)}/${format}/${String(width)}`;

export const toPhoto = (media: {
  id: string;
  originalName: string;
  width: number;
  height: number;
  createdAt: Date;
  capturedAt: Date | null;
  status: string;
  derivatives: Array<{ format: string; width: number; height: number; objectKey?: string }>;
}, frameIndex = 0) => ({
  id: media.id,
  alt: media.originalName,
  width: media.width,
  height: media.height,
  capturedAt: (media.capturedAt ?? media.createdAt).toISOString(),
  frameIndex,
  derivatives: media.derivatives.map((derivative) => ({
    format: derivative.format as PublicDerivativeFormat,
    width: derivative.width,
    height: derivative.height,
    url: derivativeUrl(media.id, derivative.format, derivative.width),
  })),
});

export const publicRouter = router({
  home: publicProcedure.query(async () => {
    const albums = await prisma.album.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      include: {
        media: {
          where: { featured: true },
          orderBy: { position: 'asc' },
          include: { media: { include: { derivatives: true } } },
        },
      },
    });

    return {
      albums: albums.flatMap((album) => {
        const photos = album.media
          .filter(({ media }) => media.status === 'ready' && media.derivatives.length > 0)
          .map(({ media }, frameIndex) => toPhoto(media, frameIndex));
        return photos.length > 0
          ? [{ slug: album.slug, title: album.title, description: album.description, photos }]
          : [];
      }),
    };
  }),

  album: publicProcedure.input(z.object({ slug: z.string().trim().min(1).max(120) })).query(async ({ input }) => {
    const album = await prisma.album.findFirst({
      where: { slug: input.slug, published: true },
      include: {
        media: {
          orderBy: { position: 'asc' },
          include: { media: { include: { derivatives: true } } },
        },
      },
    });
    if (!album) return null;

    return {
      slug: album.slug,
      title: album.title,
      description: album.description,
      photos: album.media
        .filter(({ media }) => media.status === 'ready' && media.derivatives.length > 0)
          .map(({ media }, frameIndex) => toPhoto(media, frameIndex)),
    };
  }),
});
