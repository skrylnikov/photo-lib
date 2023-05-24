export interface IPhoto {
  id: string;
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
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  vibrant?: string;
}
