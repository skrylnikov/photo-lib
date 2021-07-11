import ky from "ky";

export interface IPhoto {
  _id: string;
  filename: string;
  path: string;
  camera: string;
  orientation: string;
  exposureTime: number;
  iso: number;
  date: Date;
  aperture: number;
  width: number;
  height: number;
  lens: string;
  lat?: number;
  lng?: number;
}

export const getPhotolistAll = async () => {
  return await ky.get('/api/photo-list/all').json<IPhoto[]>();
};
