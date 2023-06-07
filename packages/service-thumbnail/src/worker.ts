import { SandboxedJob } from 'bullmq';
import { prisma } from 'database';
import sharp from 'sharp';
import { resolve } from 'node:path';
import { storagePath, cachePath } from 'config';

import { IDataType } from './types';

const formatQualityMap = {
  webp: 80,
  avif: 65,
  heif: 70,
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

  const result = await sharp(resolve(storagePath, path))
    .resize(resizeProps)
    .rotate()
    [format]({ quality: formatQualityMap[format] })
    .toFile(resolve(cachePath, 'thumbnails', thumbnailName));

  await prisma.thumbnail.create({
    data: {
      path: thumbnailName,
      format,
      size: size,
      width: result.width,
      height: result.height,
      imageId: id,
    },
  });
};

export default async (job: SandboxedJob<IDataType>) => {
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
    if (image?.Thumbnail.some((x) => x.format === job.data.format && x.size === job.data.size)) {
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

    console.log(`Finish processing job ${job.data.path} ${image.id} ${job.data.format} ${job.data.size}`);
  } catch (error) {
    console.error(error);
  }
};
