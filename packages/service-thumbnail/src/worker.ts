import { Worker } from 'bullmq';
import { prisma } from 'database';
import sharp from 'sharp';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { storagePath, cachePath, reddis } from 'config';

import { IDataType } from './types';

interface IBuildProps {
  path: string;
  id: string;
  size: 'hd' | 'uhd' | 'full';
  width: number;
  height: number;
}

const buildThumbnail = async ({
  path,
  id,
  size,
  width,
  height,
}: IBuildProps) => {
  const thumbnailName = `${id}@${size}.webp`;
  console.time(thumbnailName);

  const resizeProps: { width?: number; height?: number } = {};
  if (size !== 'full') {
    const maxSize = size === 'hd' ? 720 : 3072;
    if (width >= height) {
      resizeProps.width = Math.min(width, maxSize);
    } else {
      resizeProps.height = Math.min(height, maxSize);
    }
  }

  const result = await sharp(resolve(storagePath, path))
    .resize(resizeProps)
    .rotate()
    .webp({ quality: 75 })
    .toFile(resolve(cachePath, 'thumbnails', thumbnailName));
  console.timeEnd(thumbnailName);

  const s = await stat(resolve(cachePath, 'thumbnails', thumbnailName));

  console.log(s.size / 1024 + 'kb');

  await prisma.thumbnail.create({
    data: {
      path: thumbnailName,
      format: 'webp',
      size: size,
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
          files: true,
        },
      });

      console.log('image', image?.id);

      if (!image) {
        await job.log('Image not found');
        console.log('Image not found');
        return;
      }
      if (image?.Thumbnail.length) {
        await job.log('Image already processed');
        console.log('Image already processed');
        return;
      }

      const { width, height } = image.files.find(
        (file) => file.path === job.data.path
      )!;
        console.time('buildThumbnail');
      await Promise.all([
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          size: 'full',
          width,
          height,
        }),
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          size: 'uhd',
          width,
          height,
        }),
        buildThumbnail({
          path: job.data.path,
          id: image.id,
          size: 'hd',
          width,
          height,
        }),
      ]);

      console.timeEnd('buildThumbnail');

      console.log(`Finish processing job ${job.data.path} ${image.id}`);
    } catch (error) {
      console.error(error);
    }
  },
  {
    concurrency: 1,
    connection: reddis,
  }
);
