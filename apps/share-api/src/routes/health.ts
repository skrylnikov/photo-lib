import type { FastifyInstance } from 'fastify';

import {
  requiredCodecCapabilities,
  type CodecCapabilities,
} from '../media/codec-runtime';

export const registerHealthRoutes = (
  app: FastifyInstance,
  codecVersions: Record<string, string>,
  codecCapabilities: CodecCapabilities,
): void => {
  app.get('/', () => ({ service: 'photo-library' }));
  app.get('/health', () => ({ status: 'ok', codecVersions, codecCapabilities }));
  app.get('/ready', (_request, reply) => {
    const missingCapabilities = requiredCodecCapabilities.filter(
      (capability) => !codecCapabilities[capability],
    );
    return missingCapabilities.length === 0
      ? { status: 'ready' }
      : reply.code(503).send({ status: 'not_ready', missingCapabilities });
  });
};
