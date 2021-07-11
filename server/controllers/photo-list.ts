import Router from "koa-router";
import { Photo } from 'repositories';

export const photoList = new Router();

photoList.get('/all', async (ctx) => {
  const photoListMaybi = await Photo.findAll();

  if (photoListMaybi.isNone()) {
    ctx.body = [];
    return;
  }
  const photoList = photoListMaybi.value;

  photoList.sort((a, b) => b.date.valueOf() - a.date.valueOf());

  ctx.body = photoList;
});

