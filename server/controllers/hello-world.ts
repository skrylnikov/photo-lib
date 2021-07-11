import Router from "koa-router";

export const helloWorld = new Router();

helloWorld.get('/', (ctx) => {
  ctx.body = '<h1>Hello World</h1>';
});

