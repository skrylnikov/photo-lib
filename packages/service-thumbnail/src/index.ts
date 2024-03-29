import { Worker } from 'node:worker_threads';
import { Queue } from 'bullmq';
import * as url from 'node:url';
import * as fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { cachePath, reddis } from 'config';

import { IDataType } from './types';


const queue = new Queue<IDataType>('service-thumbnail', {
  connection: reddis,
});

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const ServiceThumbnail = {
  init: async () => {
    console.log('ServiceThumbnail init');
    try {
      new Worker(resolve(dirname, './worker.js'));
    } catch (e) {
      console.error(e);
    }
  },
  generateThumbnail: async (path: string) => {
    try {
      await queue.add('generateThumbnail', { path, format: 'webp', size: 'preview' }, {priority: 1});
      await queue.add('generateThumbnail', { path, format: 'webp', size: 'full' }, {priority: 2});
      await queue.add('generateThumbnail', { path, format: 'avif', size: 'preview' }, {priority: 3});
      await queue.add('generateThumbnail', { path, format: 'avif', size: 'full' }, {priority: 4});
    } catch (e) {
      console.error(e);
    }
  },

  clear: async () => {
    const dir = await fs.opendir(resolve(cachePath, 'thumbnails'));

    for await (const dirent of dir) {
      if (dirent.name.startsWith('.') || dirent.isDirectory()) {
        continue;
      }
      await fs.rm(resolve(cachePath, 'thumbnails', dirent.name));
    }
  },
};
