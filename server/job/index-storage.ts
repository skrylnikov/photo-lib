import { resolve } from 'path';
import { readdir, unlink, stat } from 'fs/promises';

import { parse, rotation } from 'exifr';
import { FS } from 'lib/fs';
import sharp from 'sharp';
import { Photo } from 'repositories';
import Vibrant from 'sharp-vibrant';
import { pipe, map, filter, last } from 'remeda';

import { storagePath, previewPath } from '../config';

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

  const pathList = await FS.deepReadDir(storagePath);

  console.log(`storage has ${pathList.length} files`);

  let findedItems = 0;
  for (const path of pathList) {
    const savedPhoto = await Photo.findByPath(path);
    if (savedPhoto.isJust()) {
      continue;
    }
    findedItems++;

    try {



      const originalFilePath = resolve(storagePath, path);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const exif: IExif = await parse(originalFilePath, { skip: ['PrintIM', 'ComponentsConfiguration'] });
      const rotate = await rotation(originalFilePath);

      const palette = await Vibrant.from(originalFilePath).getPalette();
    
      console.log(palette.palette.Vibrant?.hex);

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

      const photoMaybi = await Photo.create({
        path,
        filename: last(path.split('/'))!,
        camera: exif.Make && exif.Model ? (exif.Make + ' ' + exif.Model) : null,
        orientation: exif.Orientation,
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
      });

      if (photoMaybi.isNone()) {
        continue;
      }

      const id = photoMaybi.value._id;

      const isVertical = height > width;

      await sharp(originalFilePath)
        .resize(isVertical ? { height: 1000 } : { width: 1000 })
        .webp({ quality: 80 })
        // .jpeg({ mozjpeg: true, quality: 80 })
        .toFile(resolve(previewPath, id + '.webp'));

    } catch (e) {
      console.error(e);
      console.log(path);
    }
  }
  console.log(`finded ${findedItems} new files`);
};

export const reindexStorage = async () => {
  await Photo.reset();

  const files = await readdir(previewPath);

  await pipe(
    files,
    filter((x) => x.includes('.jpg')),
    map((x) => unlink(resolve(previewPath, x))),
    (x) => Promise.all(x),
  );


  await indexStorage();

};
