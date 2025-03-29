import { createKbEntry, editKbEntry } from './api/manual-kb';
import { router } from './trpc';

export const appRouter = router({
  createKbEntry,
  editKbEntry,
});

export type AppRouter = typeof appRouter;
