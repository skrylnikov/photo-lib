
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

import { appConfig } from 'config';
import { configureSqlite } from 'database';

import { launch } from './job';
import { appRouter } from './routers';
import { createContext } from './context';
import { registerAuthRoutes } from './auth/routes';
import { registerMediaRoutes } from './routes/media';
import { ensureCache } from './storage/cache';
import {
  codecVersionDiagnostics,
  probeInstalledCodecRuntime,
  requiredCodecCapabilities,
} from './media/codec-runtime';

const loadHevcProbeFixture = async (): Promise<Buffer> => {
  const candidates = [
    resolve('test-fixtures/heic/tiled-6x8.heic'),
    resolve('../../test-fixtures/heic/tiled-6x8.heic'),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      // Try the next repo-root/runtime layout.
    }
  }
  throw new Error('hevc_probe_fixture_missing');
};

const [codecVersions, codecCapabilities] = await Promise.all([
  codecVersionDiagnostics(),
  loadHevcProbeFixture().then(probeInstalledCodecRuntime),
]);

const app = fastify({ logger: true, routerOptions: { maxParamLength: 5000 } });

await app.register(cookie);
await app.register(multipart, { limits: { fileSize: appConfig.media.maxBytes } });

app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

app.register((fastify) => {
  fastify.get('/', () => ({ service: 'photo-library' }));
  fastify.get('/health', () => ({ status: 'ok', codecVersions, codecCapabilities }));
});

registerAuthRoutes(app);
registerMediaRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  app.log.error({ type: error instanceof Error ? error.name : 'unknown' }, 'request failed');
  reply.send({
    status: 'error',
    message: 'request_failed',
  });
});

await configureSqlite();
await ensureCache();
if (requiredCodecCapabilities.some((capability) => !codecCapabilities[capability])) {
  app.log.warn({ codecCapabilities }, 'required media codec is unavailable');
}

app.listen({ port: appConfig.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.info(`Server listening on ${address}`);
});

launch();
