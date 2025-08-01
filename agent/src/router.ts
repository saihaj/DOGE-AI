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
  getControlPlanePromptVersions,
  getOrganization,
  getOrgs,
  revertControlPlanePromptVersion,
  updateControlPlanePromptByKey,
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
  updateControlPlanePromptByKey,
  getControlPlanePromptVersions,
  revertControlPlanePromptVersion,
});

export type AppRouter = typeof appRouter;
