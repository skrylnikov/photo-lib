import { resolve } from 'path';
import { stat } from 'fs/promises';

import { parse, rotation } from 'exifr';
import { prisma } from 'database';
import Vibrant from 'sharp-vibrant';
import { last } from 'remeda';

import { deepReadDir } from '../lib/fs';
import { storagePath } from '../config';

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
    const savedPhoto = await prisma.photo.findFirst({ where: { path } });
    if (savedPhoto) {
      continue;
    }
    findedItems++;

    try {



      const originalFilePath = resolve(storagePath, path);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const exif: IExif = await parse(originalFilePath, { skip: ['PrintIM', 'ComponentsConfiguration'] });
      const rotate = await rotation(originalFilePath);

      const palette = await Vibrant.from(originalFilePath).getPalette();

      const date = exif.CreateDate || (await stat(originalFilePath)).birthtime;

      let width = exif.ImageWidth || exif.ExifImageWidth;
      let height = exif.ImageHeight || exif.ExifImageHeight;

      // const rotate = typeof exif.Orientation === 'number' ? exif.Orientation : Number.parseInt(exif.Orientation?.split?.(' ')?.[1]) || 0;

      if (rotate?.dimensionSwapped) {
        [width, height] = [height, width];
      }

      if (!width || !height) {
        console.error(`${path}: width or height not found`);
        console.log(exif);

      }

      await prisma.photo.create({
        data: {
          path,
          filename: last(path.split('/'))!,
          camera: exif.Make && exif.Model ? (exif.Make + ' ' + exif.Model) : null,
          orientation: exif.Orientation.toString(),
          exposureTime: exif.ExposureTime,
          iso: exif.ISO,
          date,
          aperture: exif.ApertureValue,
          width,
          height,
          lens: exif.LensMake && exif.LensModel ? (exif.LensMake + ' ' + exif.LensModel) : null,
          lat: exif.latitude,
          lng: exif.longitude,
          rotate: rotate?.deg || 0,
          scaleX: rotate?.scaleX || 1,
          scaleY: rotate?.scaleY || 1,
          vibrant: palette.palette.LightMuted?.hex,
        },
      });

    } catch (e) {
      console.error(e);
      console.log(path);
    }
  }
  console.log(`finded ${findedItems} new files`);
};

export const reindexStorage = async () => {
  await prisma.photo.deleteMany();

  await indexStorage();

};
