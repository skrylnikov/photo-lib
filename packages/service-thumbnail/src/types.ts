
export interface IDataType {
  path: string;
  format: 'webp' | 'avif' | 'heif' | 'jxl';
  size: 'preview' | 'full';
}
