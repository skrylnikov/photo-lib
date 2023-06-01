import Koa from 'koa';
import logger from 'koa-logger';

import { ServiceThumbnail } from 'service-thumbnail';

import { controllers } from './controllers';
import { launch } from './job';

const app = new Koa();

app
  .use(logger())
  .use(controllers.routes())
  .listen(3000);


launch();

ServiceThumbnail.init();
