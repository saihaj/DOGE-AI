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
import {
  createOrganization,
  getControlPlanePromptByKey,
  getControlPlanePromptKeys,
  getOrganization,
  getOrgs,
} from './controlplane-api/router';

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
  createOrganization,
  getOrganization,
  getControlPlanePromptKeys,
  getControlPlanePromptByKey,
  getOrgs,
});

export type AppRouter = typeof appRouter;
