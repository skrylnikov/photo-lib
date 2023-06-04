import { router } from '../trpc';
 
import { imageRouter } from './image';
 
export const appRouter = router({
  image: imageRouter,
});
 
export type AppRouter = typeof appRouter;
