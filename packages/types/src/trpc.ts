import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';

import type { AppRouter } from 'share-api/src/routers';

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
export type { AppRouter };
