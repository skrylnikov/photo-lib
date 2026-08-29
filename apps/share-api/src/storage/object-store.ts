import { S3mini } from 's3mini';

import { appConfig } from 'config';

export type ObjectStore = {
  put(key: string, data: Uint8Array | ReadableStream<Uint8Array> | Blob, contentType: string, bytes?: number): Promise<void>;
  multipartPut(key: string, data: Uint8Array, contentType: string): Promise<void>;
  presignPut(key: string, contentType: string): Promise<string>;
  exists(key: string): Promise<boolean>;
  size(key: string): Promise<number | null>;
  response(key: string): Promise<Response | null>;
  remove(key: string): Promise<void>;
  list(prefix: string): Promise<Array<{ key: string; lastModified: Date }>>;
};

const client = new S3mini({
  accessKeyId: appConfig.rustfs.accessKeyId,
  secretAccessKey: appConfig.rustfs.secretAccessKey,
  endpoint: appConfig.rustfs.endpoint,
  region: appConfig.rustfs.region,
});

const publicClient = new S3mini({
  accessKeyId: appConfig.rustfs.accessKeyId,
  secretAccessKey: appConfig.rustfs.secretAccessKey,
  endpoint: appConfig.rustfs.publicEndpoint,
  region: appConfig.rustfs.region,
});

export const objectStore: ObjectStore = {
  async put(key, data, contentType, bytes) {
    await client.putAnyObject(key, data, contentType, undefined, undefined, bytes);
  },
  async multipartPut(key, data, contentType) {
    const uploadId = await client.getMultipartUploadId(key, contentType);
    const partSize = 5 * 1024 * 1024;
    const parts = [];
    try {
      for (let offset = 0, partNumber = 1; offset < data.byteLength; offset += partSize, partNumber += 1) {
        parts.push(await client.uploadPart(key, uploadId, data.subarray(offset, offset + partSize), partNumber));
      }
      await client.completeMultipartUpload(key, uploadId, parts);
    } catch (error) {
      await client.abortMultipartUpload(key, uploadId).catch(() => undefined);
      throw error;
    }
  },
  async presignPut(key, _contentType) {
    void _contentType;
    return publicClient.getPresignedUrl(
      'PUT',
      key,
      appConfig.rustfs.presignSeconds,
    );
  },
  async exists(key) {
    return (await client.objectExists(key)) === true;
  },
  async size(key) {
    try {
      return await client.getContentLength(key);
    } catch {
      return null;
    }
  },
  async response(key) {
    try {
      return await client.getObjectResponse(key);
    } catch {
      return null;
    }
  },
  async remove(key) {
    await client.deleteObject(key);
  },
  async list(prefix) {
    const objects = await client.listObjects('/', prefix);
    return (objects ?? []).flatMap((object) => object.Key ? [{ key: object.Key, lastModified: object.LastModified }] : []);
  },
};
