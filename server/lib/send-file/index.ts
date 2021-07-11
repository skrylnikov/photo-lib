// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { extname } from "path";
import { createReadStream } from "fs";
import { stat } from 'fs/promises';

import calculate from 'etag';
import Koa from 'koa';


const notfound = {
  ENOENT: true,
  ENAMETOOLONG: true,
  ENOTDIR: true,
};

export const sendFile = async (ctx: Koa.ParameterizedContext, path: string) => {
  try {
    const stats = await stat(path);

    if (!stats) return null;
    if (!stats.isFile()) return stats;

    ctx.response.status = 200;
    ctx.response.lastModified = stats.mtime;
    ctx.response.length = stats.size;
    ctx.response.type = extname(path);

    if (!ctx.response.etag) {
      ctx.response.etag = calculate(stats, {
        weak: true,
      });
    }

    // fresh based solely on last-modified
    switch (ctx.request.method) {
      case 'HEAD':
        ctx.status = ctx.request.fresh ? 304 : 200;
        break;
      case 'GET':
        if (ctx.request.fresh) {
          ctx.status = 304;
        } else {
          ctx.body = createReadStream(path);
        }
        break;
    }

    return stats;
  } catch (err) {
    if (notfound[err.code as keyof typeof notfound]) return;
    err.status = 500;
    throw err;
  }
};
