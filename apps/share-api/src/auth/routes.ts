import type { FastifyInstance } from 'fastify';

import { appConfig } from 'config';

import { beginLogin, finishLogin, purgePendingLogins } from './oidc';
import { readSession, revokeSession } from './session';

export const registerAuthRoutes = (app: FastifyInstance): void => {
  app.get('/auth/login', async (_request, reply) => {
    purgePendingLogins();
    try {
      return await reply.redirect(await beginLogin());
    } catch {
      return reply.code(503).send({ error: 'authentication_unavailable' });
    }
  });

  app.get('/auth/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string };
    try {
      const session = await finishLogin(query.code, query.state);
      reply.setCookie(appConfig.oidc.cookieName, session.token, {
        httpOnly: true,
        secure: appConfig.oidc.cookieSecure,
        sameSite: 'lax',
        path: '/',
        expires: session.expiresAt,
      });
      return await reply.redirect('/admin');
    } catch {
      return reply.code(401).send({ error: 'authentication_failed' });
    }
  });

  app.post('/auth/logout', async (request, reply) => {
    await revokeSession(request.cookies[appConfig.oidc.cookieName]);
    reply.clearCookie(appConfig.oidc.cookieName, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/auth/session', async (request) => ({
    authenticated: Boolean(
      await readSession(request.cookies[appConfig.oidc.cookieName]),
    ),
  }));
};
