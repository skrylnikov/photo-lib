import { S3Client } from "bun";

import { Bot } from 'grammy';
import { Queue } from 'bullmq';
import Exifr from "exifr";

import { tgBotToken } from '@pl/config';
import { redis, s3 } from '@pl/config';
import type { ServiceThumbnail } from '@pl/types';
import { prisma } from '@pl/database'
import { nanoid } from "nanoid";
import sharp from 'sharp';
const bot = new Bot(tgBotToken);

const queue = new Queue<ServiceThumbnail.Props>('service-thumbnail', {
  connection: redis,
});

const client = new S3Client(s3);


const generateThumbnail = async (path: string) => {
  try {
    await queue.add(
      'generateThumbnail',
      { path, format: 'webp', size: 'preview' },
      { priority: 1 }
    );
    await queue.add(
      'generateThumbnail',
      { path, format: 'webp', size: 'full' },
      { priority: 2 }
    );
    await queue.add(
      'generateThumbnail',
      { path, format: 'heif', size: 'preview' },
      { priority: 3 }
    );
    await queue.add(
      'generateThumbnail',
      { path, format: 'heif', size: 'full' },
      { priority: 4 }
    );
    await queue.add(
      'generateThumbnail',
      { path, format: 'jxl', size: 'preview' },
      { priority: 5 }
    );
    await queue.add(
      'generateThumbnail',
      { path, format: 'jxl', size: 'full' },
      { priority: 6 }
    );
    await queue.add(
      'generateThumbnail',
      { path, format: 'avif', size: 'preview' },
      { priority: 7 }
    );
    await queue.add(
      'generateThumbnail',
      { path, format: 'avif', size: 'full' },
      { priority: 8 }
    );
  } catch (e) {
    console.error(e);
  }
};

interface IExif {
  Make: string;
  Model: string;
  Orientation: string;
  ExposureTime: number;
  ISO: number;
  CreateDate: Date;
  ApertureValue: number;
  ExifImageWidth: number;
  ExifImageHeight: number;
  ImageWidth: number;
  ImageHeight: number;
  LensMake: string;
  LensModel: string;
  latitude: number;
  longitude: number;
}


const indexFile = async (file: ArrayBuffer, filename: string) => {
  const path = 'originals/' + filename;
  const [exif, rotate, metadata] = await Promise.all([
    Exifr.parse(file, {
      skip: ['PrintIM', 'ComponentsConfiguration'],
    }) as Promise<IExif>,
    Exifr.rotation(file),
    sharp(file).metadata(),
    client.write(path, file)
  ]);

  const date = exif?.CreateDate || new Date();

  let width = exif?.ImageWidth || exif?.ExifImageWidth;
  let height = exif?.ImageHeight || exif?.ExifImageHeight;

  if (!exif) {
    width = metadata.width!;
    height = metadata.height!;
  }

  if (rotate?.dimensionSwapped) {
    [width, height] = [height, width];
  }

  await prisma.image.create({
    data: {
      filename: filename,
      camera:
        exif?.Make && exif?.Model ? exif.Make + ' ' + exif.Model : null,
      exposureTime: exif?.ExposureTime,
      iso: exif?.ISO,
      date,
      aperture: exif?.ApertureValue,
      lens: [exif?.LensMake, exif?.LensModel].join(' ') || null,
      lat: exif?.latitude,
      lng: exif?.longitude,

      files: {
        create: {
          path,
          type: 'Image',
          extension: metadata.format || 'jpg',
          width,
          height,
          primary: true,
          date,
          rotate: rotate?.deg || 0,
          scaleX: rotate?.scaleX || 1,
          scaleY: rotate?.scaleY || 1,
        },
      },
    },
  });

  await generateThumbnail(path);
}

bot.command(['help', 'start'], (ctx) =>
  ctx.reply(`Отправь фото файлом для загрузки. Файл должен быть меньше 20мб.
/reindex -  принудительно переиндексировать хранилище
`)
);

// bot.command('reindex', async (ctx) => {
//   try {
//     await fetch(`${shareApiUrl}/storage/reindex`);
//     return ctx.reply(`Переиндексация запущена`);
//   } catch (e) {
//     console.error(e);
//   } finally {
//     return ctx.reply(`Что-то пошло не так`);
//   }
// });

bot.on(['message:photo', 'message:document'], async (ctx) => {
  try {

    const file = await ctx.getFile();

    if (!file) {
      return ctx.reply(`Файл не найден`);
    }

    const result = await fetch(
      `https://api.telegram.org/file/bot${tgBotToken}/${file.file_path}`
    );

    // const extension = file.file_path?.split('.').pop();

    const filename = ctx.message.document?.file_name || file.file_path?.split('/').pop() || nanoid(6);

    
    if (result.status === 200 && result.body) {
      const fileBuffer = await result.arrayBuffer();

      await indexFile(fileBuffer, filename);

      ctx.reply(`Фото получено`);
      return;
    }

  } catch (e) {
    console.error(e);
    return ctx.reply(`Что-то пошло не так(`);
  }
});

bot.start();

console.log('Bot started');

