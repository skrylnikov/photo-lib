import { resolve } from 'path';

import DB from 'nedb-promises';
import { Maybe, none, just } from '@sweet-monads/maybe';
import { nanoid } from 'nanoid';
import { dbPath } from 'config';

const db = DB.create({
  filename: resolve(dbPath, 'photo.db'),
});

db.ensureIndex({ fieldName: 'path', unique: true }).catch((e) => console.error(e));

export interface IPhoto {
  _id: string;
  filename: string;
  path: string;
  camera: string | null;
  orientation: string;
  exposureTime: number;
  iso: number;
  date: Date;
  aperture: number;
  width: number;
  height: number;
  lens: string | null;
  lat?: number;
  lng?: number;
}

export const findByPath = async (path: string): Promise<Maybe<IPhoto>> => {
  const photo = await db.findOne<IPhoto>({ path });
  if (!photo) {
    return none();
  }
  return just(photo);
};

export const findAll = async (): Promise<Maybe<IPhoto[]>> => {
  const list = await db.find<IPhoto>({ });
  if (!list) {
    return none();
  }
  return just(list);
};
export const create = async (photo: Omit<IPhoto, '_id'>): Promise<Maybe<IPhoto>> => {
  const result = await db.insert({
    ...photo,
    _id: nanoid(10),
  });

  if (!photo) {
    return none();
  }
  return just(result);
};

export const reset = async () => {
  await db.remove({}, { multi: true });
};
