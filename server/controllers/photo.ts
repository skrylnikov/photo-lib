import { resolve } from 'path';

import Router from "koa-router";
import { sendFile } from 'lib/send-file';
import { storagePath } from 'config';

export const photo = new Router();

photo.get('/(.*)', async (ctx) => {

  await sendFile(
    ctx,
    resolve(
      storagePath,
      ctx.params['0'],
    ),
  );


  if (!ctx.status) ctx.throw(404);
});

