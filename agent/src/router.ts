import { createKbEntry } from './api/manual-kb';
import { router } from './trpc';

export const appRouter = router({
  createKbEntry,
});

export type AppRouter = typeof appRouter;
