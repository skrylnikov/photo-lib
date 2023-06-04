import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';

import type { AppRouter } from 'share-api/src/routers';


export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
    }),
  ],
});

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
