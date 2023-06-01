import { Worker } from 'bullmq';
import { prisma } from 'database';
import sharp from 'sharp';
import { expose } from 'threads';
import { resolve } from 'node:path';

import { IDataType } from './types';

console.log('worker init');

export const storagePath = process.env.STORAGE_PATH as string;

const worker = new Worker<IDataType>(
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
      });

      console.log('image', image?.id);

      if (!image) {
        await job.log('Image not found');
        console.log('Image not found');
        return;
      }

      const filePath = resolve(storagePath, job.data.path);

      await sharp(filePath)
        .resize({ height: 350 })
        .webp({ quality: 70 })
        .toFile(resolve(__dirname, '../../../cache/thumbnails', `${image.id}.webp`));

      await job.updateProgress(20);

      await sharp(filePath)
        .resize({ height: 700 })
        .webp({ quality: 70 })
        .toFile(resolve(__dirname, '../../../cache/thumbnails', `${image.id}@2x.webp`));

      await job.updateProgress(40);

      await sharp(filePath)
        .resize({ height: 350 })
        .avif({ quality: 45 })
        .toFile(resolve(__dirname, '../../../cache/thumbnails', `${image.id}.avif`));

      await job.updateProgress(60);

      await sharp(filePath)
        .resize({ height: 700 })
        .avif({ quality: 45 })
        .toFile(resolve(__dirname, '../../../cache/thumbnails', `${image.id}2x.avif`));

      await job.log('Finish processing job');
    } catch (error) {
      console.error(error);
    }
  },
  {
    concurrency: 1,
  }
);

expose({});
