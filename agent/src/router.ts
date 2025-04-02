import {
  createKbEntry,
  deleteKbEntry,
  editKbEntry,
  getKbEntries,
} from './api/manual-kb';
import { router } from './trpc';
import {
  getPromptByKey,
  getPromptKeys,
  getPromptVersions,
  revertPromptVersion,
  updatePromptByKey,
} from './api/prompt';

export const appRouter = router({
  createKbEntry,
  editKbEntry,
  deleteKbEntry,
  getKbEntries,
  getPromptKeys,
  getPromptByKey,
  updatePromptByKey,
  getPromptVersions,
  revertPromptVersion,
});

export type AppRouter = typeof appRouter;
