import Router from "koa-router";
import { reindexStorage } from 'job';


export const reindex = new Router();

reindex.get('/', (ctx) => {

  reindexStorage().catch((e) => console.error(e));

  ctx.body = { status: 'ok' };
});

