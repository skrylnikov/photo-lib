import Rounter from "koa-router";

import { helloWorld } from './hello-world';
import { photoList } from './photo-list';
import { photo } from "./photo";
import { preview } from './preview';
import { reindex } from './reindex';

export const controllers = new Rounter();

controllers.use('/photo', photo.routes());
controllers.use('/preview', preview.routes());
controllers.use('/photo-list', photoList.routes());
controllers.use('/reindex', reindex.routes());
controllers.use('/', helloWorld.routes());
