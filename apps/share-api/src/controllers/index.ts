import Rounter from "koa-router";

import { photoList } from './photo-list';
// import { reindex } from './reindex';

export const controllers = new Rounter();

controllers.use('/photo-list', photoList.routes());
// controllers.use('/reindex', reindex.routes());
