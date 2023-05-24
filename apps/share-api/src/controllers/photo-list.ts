import Router from "koa-router";
import { prisma } from 'database';

export const photoList = new Router();

photoList.get('/all', async (ctx) => {

  const list = await prisma.photo.findMany({
    orderBy: {
      date: 'desc',
    },
  });


  ctx.body = list;
});

