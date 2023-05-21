import { resolve } from "path";
import { readdir, rename, utimes } from "fs/promises";

import { parse } from "exifr";
import { FS } from "lib/fs";
import sharp from "sharp";
import { pipe, map, filter, last, groupBy } from "remeda";

import { format } from "date-fns";

import { storagePath, previewPath } from "../config";

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
  SubSecTime: string;
  SubSecTimeOriginal: string;
}

export const reindexStorage = async () => {
  const root = "/Volumes/storage/photo/tmp";

  const files = await readdir(root);

  console.log("start parse exif");

  const preData = await Promise.all(
    pipe(
      files,
      filter(
        (x) =>
          x.includes(".NEF") ||
          x.includes(".heic") ||
          x.includes(".JPG") ||
          x.includes(".jpg")
      ),
      map((x) => x.split(".")),
      map(async ([name, ext]) => {
        const originPath = resolve(root, name + "." + ext);
        const exif = (await parse(originPath)) as IExif;
        // console.log(originPath);

        const shortDateTime = exif.CreateDate ? format(exif.CreateDate, "yyyy-MM-dd HH mm ss") : name;
        console.log(shortDateTime);

        return {
          originPath,
          exif,
          shortDateTime,
          ext,
        };
      }),
    )
  );

  const groupedData = groupBy(preData, (x) => x.shortDateTime);

  console.log("start rename");

  let counter = 0;

  const result = await Promise.all(
    pipe(
      preData,
      map(async ({ originPath, exif, shortDateTime, ext }) => {
        const dateTime =
          shortDateTime +
          (groupedData[shortDateTime].length > 1
            ? ` ${exif.SubSecTime || exif.SubSecTimeOriginal || counter++}`
            : "");

        console.log(dateTime);

        // await utimes(originPath, new Date(), exif.CreateDate);
        await rename(originPath, resolve(root, dateTime + "." + ext));
      })
    )
  );

  console.log("success");
};

reindexStorage();
