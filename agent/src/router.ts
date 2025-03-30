import {
  createKbEntry,
  deleteKbEntry,
  editKbEntry,
  getKbEntries,
} from './api/manual-kb';
import { router } from './trpc';
import { getPrompt, getPromptKeys } from './api/prompts';

export const appRouter = router({
  createKbEntry,
  editKbEntry,
  deleteKbEntry,
  getKbEntries,
  getPromptKeys,
  getPrompt,
});

export type AppRouter = typeof appRouter;
