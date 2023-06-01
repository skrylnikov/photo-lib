import Router from 'koa-router';
import { prisma } from 'database';

export const photoList = new Router();

photoList.get('/all', async (ctx) => {
  const list = await prisma.image.findMany({
    orderBy: {
      date: 'desc',
    },
    include: {
      Thumbnail: true,
    },
  });

  ctx.body = list;
});
