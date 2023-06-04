import { FastifyInstance } from 'fastify';

export const storageRouter = async (fastify: FastifyInstance) => {

  fastify.get<{
    Params: {
      path: string;
    }
  }>('/thumpnail/:path', async (request, reply) => {
     request.params.path;

    return {
      status: 'ok',
    };
  });
}
