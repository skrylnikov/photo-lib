import { Worker } from 'bullmq';
import { prisma } from 'database';
import sharp from 'sharp';
import { resolve } from 'node:path';

import { storagePath, cachePath, reddis } from 'config';

import { IDataType } from './types';

interface IBuildProps {
  path: string;
  id: string;
  format: 'webp' | 'avif';
  size: 1 | 2 | 'full';
}

const formatQuality = {
  webp: 60,
  avif: 40,
};

const buildThumbnail = async ({ path, id, format, size }: IBuildProps) => {
  const strSize = typeof size === 'number' ? `x${size}` as const : size;

  const thumbnailName = `${id}@${strSize}.${format}`;
  const result = await sharp(resolve(storagePath, path))
    .resize(typeof size === 'number' ? { height: size * 350 } : {})
    .rotate()
    // eslint-disable-next-line no-unexpected-multiline
    [format]({ quality: formatQuality[format] })
    .toFile(resolve(cachePath, 'thumbnails', thumbnailName));

  await prisma.thumbnail.create({
    data: {
      path: thumbnailName,
      format,
      size: strSize,
      width: result.width,
      height: result.height,
      imageId: id,
    },
  });
};
new Worker<IDataType>(
  'service-thumbnail',
  async (job) => {
    try {
      await job.log('Start processing job');
      console.log('Start processing job');

      const image = await prisma.image.findFirst({
        where: {
          files: {
            some: {
              path: job.data.path,
            },
          },
        },
        include: {
          Thumbnail: true,
        }
      });

      
      console.log('image', image?.id);
      
      if (!image) {
        await job.log('Image not found');
        console.log('Image not found');
        return;
      }
      if(image?.Thumbnail.length) {
        await job.log('Image already processed');
        console.log('Image already processed');
        return;
      }
      
      await Promise.all([
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          format: 'webp',
          size: 'full',
        }),
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          format: 'webp',
          size: 1,
        }),
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          format: 'webp',
          size: 2,
        }),
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          format: 'avif',
          size: 'full',
        }),
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          format: 'avif',
          size: 1,
        }),
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          format: 'avif',
          size: 2,
        }),
      ]);

      await job.log('Finish processing job');
    } catch (error) {
      console.error(error);
    }
  },
  {
    concurrency: 1,
    connection: reddis,
  }
);
