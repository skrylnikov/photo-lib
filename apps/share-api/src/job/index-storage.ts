import { resolve } from 'path';
import { stat } from 'fs/promises';

import Exifr from 'exifr';
import { prisma } from 'database';
import { last } from 'remeda';
import sharp from 'sharp';

import { deepReadDir } from '../lib/fs';
import { storagePath } from 'config';
import { ServiceThumbnail } from 'service-thumbnail';


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

export const indexStorage = async () => {
  console.log(`start indexing storage: ${storagePath}`);

  const pathList = await deepReadDir(storagePath);

  console.log(`storage has ${pathList.length} files`);

  let findedItems = 0;
  for (const path of pathList) {
    const savedFile = await prisma.file.findFirst({ where: { path } });
    if (savedFile) {
      continue;
    }
    findedItems++; 

    try { 
      const originalFilePath = resolve(storagePath, path);

      const exif: IExif = await Exifr.parse(originalFilePath, {
        skip: ['PrintIM', 'ComponentsConfiguration'],
      });
      const rotate = await Exifr.rotation(originalFilePath);

      // const palette = await Vibrant.from(originalFilePath).getPalette();

      const date = exif?.CreateDate || (await stat(originalFilePath)).birthtime;

      let width = exif?.ImageWidth || exif?.ExifImageWidth;
      let height = exif?.ImageHeight || exif?.ExifImageHeight;

      if(!exif){
        const meta = await sharp(originalFilePath).metadata();

        width = meta.width!;
        height = meta.height!;
      }

      // const rotate = typeof exif.Orientation === 'number' ? exif.Orientation : Number.parseInt(exif.Orientation?.split?.(' ')?.[1]) || 0;

      if (rotate?.dimensionSwapped) {
        [width, height] = [height, width];
      }

      if (!width || !height) {
        console.error(`${path}: width or height not found`);
        console.log(exif);
      }
    

      await prisma.image.create({
        data: {
          // path,
          filename: last(path.split('/'))!,
          camera: exif?.Make && exif?.Model ? exif.Make + ' ' + exif.Model : null,
          // orientation: exif.Orientation.toString(),
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
              extension: last(path.split('.'))!,
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

      await ServiceThumbnail.generateThumbnail(path);
    } catch (error) {
      console.error(error);
      console.log(path);
    }
  }
  console.log(`finded ${findedItems} new files`);
};

export const reindexStorage = async () => {
  console.log('start reindexing storage')
  await Promise.all([
    prisma.image.deleteMany(),
    prisma.file.deleteMany(),
    prisma.thumbnail.deleteMany(),
    ServiceThumbnail.clear(),
  ]);

  await indexStorage();
};
