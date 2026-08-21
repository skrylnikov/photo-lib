export type PublicDerivativeFormat = 'jxl' | 'avif' | 'heic' | 'webp' | 'jpeg';

export interface PublicDerivative {
  format: PublicDerivativeFormat;
  width: number;
  height: number;
  url: string;
}

export interface PublicPhoto {
  id: string;
  alt: string;
  width: number;
  height: number;
  capturedAt: string;
  frameIndex: number;
  derivatives: PublicDerivative[];
}

export interface PublicAlbumSummary {
  slug: string;
  title: string;
  description: string | null;
  photos: PublicPhoto[];
}

export interface PublicHome {
  albums: PublicAlbumSummary[];
}

export type PublicAlbum = PublicAlbumSummary;
