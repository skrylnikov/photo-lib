import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import type { AppRouter, RouterInput, RouterOutput } from 'types';


export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
    }),
  ],
});

export type { RouterInput, RouterOutput };
