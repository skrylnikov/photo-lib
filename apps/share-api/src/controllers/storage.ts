import { FastifyInstance } from 'fastify';

import { reindexStorage } from '../job';

export const storageRouter = async (fastify: FastifyInstance) => {

  fastify.get('/reindex', async () => {

    await reindexStorage();

    return { status: 'ok' };
  });
};
