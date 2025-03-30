import {
  createKbEntry,
  deleteKbEntry,
  editKbEntry,
  getKbEntries,
} from './api/manual-kb';
import { protectedProcedure, router } from './trpc';
import { PROMPTS } from './twitter/prompts';

const getPromptKeys = protectedProcedure.query(async opts => {
  const keys = Object.keys(PROMPTS);
  return keys;
});

export const appRouter = router({
  createKbEntry,
  editKbEntry,
  deleteKbEntry,
  getKbEntries,
  getPromptKeys,
});

export type AppRouter = typeof appRouter;
