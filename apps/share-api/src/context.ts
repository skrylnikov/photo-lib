import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

import { appConfig } from 'config';
import { readSession } from './auth/session';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const cookies = (req as unknown as { cookies?: Record<string, string | undefined> }).cookies;
  const session = await readSession(cookies?.[appConfig.oidc.cookieName]);
  return { req, res, session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
