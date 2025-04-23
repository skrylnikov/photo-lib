import { S3Client } from 'bun';

import { Worker } from 'bullmq';
import sharp from 'sharp';

import { prisma } from '@pl/database';
import { redis, s3 } from '@pl/config';
import type { ServiceThumbnail } from '@pl/types';

const clientS3 = new S3Client(s3);

const formatQualityMap = {
  webp: 80,
  avif: 60,
  heif: 45,
  jxl: 75,
};

interface IBuildProps {
  path: string;
  id: string;
  size: 'preview' | 'full';
  format: 'webp' | 'avif' | 'heif' | 'jxl';
  width: number;
  height: number;
}

console.log(sharp.versions);
console.log(sharp.format);
// console.log(sharp.kernel);

// console.log(process.env)

const buildThumbnail = async ({
  path,
  id,
  size,
  width,
  height,
  format,
}: IBuildProps) => {
  const thumbnailName = `${id}@${size}.${format}`;

  const resizeProps: { width?: number; height?: number } = {};
  if (size === 'preview') {
    const maxSize = 720;
    if (width >= height) {
      resizeProps.width = Math.min(width, maxSize);
    } else {
      resizeProps.height = Math.min(height, maxSize);
    }
  }

  const file = await clientS3.file(path).arrayBuffer();

  const result = await sharp(file)
    .resize(resizeProps)
    .rotate()
    [format]({
      quality: formatQualityMap[format],
      ...(format === 'heif'
        ? {
            compression: 'hevc',
            // effort: 6,
            // chromaSubsampling: '4:4:4',
            lossless: false,
          }
        : format === 'webp'
        ? {
            preset: 'photo',
          }
        : {}),
    })
    .toBuffer({
      resolveWithObject: true,
    });

  const previewPath = `thumbnails/${thumbnailName}`;

  await clientS3.write(previewPath, result.data);

  await prisma.thumbnail.create({
    data: {
      path: previewPath,
      format,
      size,
      width: result.info.width,
      height: result.info.height,
      imageId: id,
    },
  });
};

new Worker<ServiceThumbnail.Props>(
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
        console.log('Image not found');
        return;
      }
      if (
        image.Thumbnail.some(
          (x) => x.format === job.data.format && x.size === job.data.size
        )
      ) {
        console.log('Image already processed');
        return;
      }

      const { width, height } = image.files.find(
        (file) => file.path === job.data.path
      )!;
      await buildThumbnail({
        path: job.data.path,
        id: image.id,
        size: job.data.size,
        width,
        height,
        format: job.data.format,
      });

      console.log(
        `Finish processing job ${job.data.path} ${image.id} ${job.data.format} ${job.data.size}`
      );
    } catch (error) {
      console.error(error);
    }
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

console.log('Thumbnail service started');
