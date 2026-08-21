import { router } from '../trpc';

import { adminRouter } from './admin';
import { publicRouter } from './public';

export const appRouter = router({
  public: publicRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
