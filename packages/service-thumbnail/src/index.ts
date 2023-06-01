import { spawn, Worker } from 'threads';
import { Queue } from 'bullmq';

import { IDataType } from './types';

const connection = {
  host: 'localhost',
  port: 6379,
};

const queue = new Queue<IDataType>('service-thumbnail', {
  connection,
});

export const ServiceThumbnail = {
  init: async () => {
    console.log('ServiceThumbnail init');
    try {
      const worker = new Worker('./worker');
      await spawn(worker);
    } catch (e) {
      console.error(e);
    }
  },
  generateThumbnail: async (path: string) => {
    try {
      await queue.add('generateThumbnail', { path });
    } catch (e) {
      console.error(e);
    }
  },
};
