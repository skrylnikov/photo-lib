import { resolve } from 'path';

import Router from "koa-router";
import { sendFile } from 'lib/send-file';
import { previewPath } from 'config';

export const preview = new Router();

preview.get('/(.*)', async (ctx) => {

  await sendFile(
    ctx,
    resolve(
      previewPath,
      ctx.params['0'],
    ),
  );


  if (!ctx.status) ctx.throw(404);
});

