import { resolve } from 'path';
import { readdir, unlink } from 'fs/promises';

import { parse } from 'exifr';
import { FS } from 'lib/fs';
import sharp from 'sharp';
import { Photo } from 'repositories';
import { pipe, map, filter, last } from 'rambda';

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

    const originalFilePath = resolve(storagePath, path);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const exif: IExif= await parse(originalFilePath, { skip: ['PrintIM', 'ComponentsConfiguration'] });

    const photoMaybi = await Photo.create({
      path,
      filename: last(path.split('/')),
      camera: exif.Make + ' ' + exif.Model,
      orientation: exif.Orientation,
      exposureTime: exif.ExposureTime,
      iso: exif.ISO,
      date: exif.CreateDate,
      aperture: exif.ApertureValue,
      width: exif.ExifImageWidth,
      height: exif.ExifImageHeight,
      lens: exif.LensMake + ' ' + exif.LensModel,
      lat: exif.latitude,
      lng: exif.longitude,
    });

    if (photoMaybi.isNone()) {
      continue;
    }

    const id = photoMaybi.value._id;

    await sharp(originalFilePath)
      .resize(2000)
      .jpeg({ mozjpeg: true, quality: 80 })
      .toFile(resolve(previewPath, id + '.jpg'));

  }
  console.log(`finded ${findedItems} new files`);
};

export const reindexStorage = async () => {
  await Photo.reset();

  const files = await readdir(previewPath);

  await pipe(
    () => files,
    filter((x) => x.includes('.jpg')),
    map((x) => unlink(resolve(previewPath, x))),
    (x) => Promise.all(x),
  )();


  await indexStorage();

};
