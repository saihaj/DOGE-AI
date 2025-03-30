import {
  createKbEntry,
  deleteKbEntry,
  editKbEntry,
  getKbEntries,
} from './api/manual-kb';
import { router } from './trpc';
import { getPromptByKey, getPromptKeys, updatePromptByKey } from './api/prompt';

export const appRouter = router({
  createKbEntry,
  editKbEntry,
  deleteKbEntry,
  getKbEntries,
  getPromptKeys,
  getPromptByKey,
  updatePromptByKey,
});

export type AppRouter = typeof appRouter;
