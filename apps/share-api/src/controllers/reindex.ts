import Router from 'koa-router';
import { reindexStorage } from '../job/index-storage';

export const reindex = new Router();

reindex.get('/', async (ctx) => {
  reindexStorage();
  ctx.body = {'status': 'ok'};
});
