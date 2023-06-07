
import fastify from 'fastify';
import Static from '@fastify/static';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { resolve } from 'node:path';

import { cachePath, storagePath } from 'config';
import { ServiceThumbnail } from 'service-thumbnail';

import { launch } from './job';
import { appRouter } from './routers';
import { createContext } from './context';

import './bot';

const app = fastify({ logger: true, maxParamLength: 5000,  });

app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

app.register(Static, {
  root: resolve(cachePath, 'thumbnails'),
  prefix: '/storage/thumbnails',
  maxAge: '10d',
});

app.register(Static, {
  root: storagePath,
  prefix: '/storage/file',
  maxAge: '10d',
  decorateReply: false 
});

app.register(async (fastify) => {
  fastify.get('/', async (req, res) => {
    return 'hello world';
  });
  fastify.get('/health', async () => {
    return { status: 'ok' }; 
  });
})

app.setErrorHandler((error, request, reply) => {
  console.error(error);
  reply.send({ status: 'error', message: error.message });
});

app.listen({ port: 4001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.info(`Server listening on ${address}`);
});

launch();

ServiceThumbnail.init();
