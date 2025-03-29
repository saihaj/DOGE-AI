import { createKbEntry, deleteKbEntry, editKbEntry } from './api/manual-kb';
import { router } from './trpc';

export const appRouter = router({
  createKbEntry,
  editKbEntry,
  deleteKbEntry,
});

export type AppRouter = typeof appRouter;
